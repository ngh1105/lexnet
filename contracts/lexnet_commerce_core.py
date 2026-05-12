# { "Depends": "py-genlayer:test" }

from genlayer import *
import json


DRAFT = "DRAFT"
ACTIVE = "ACTIVE"
EVIDENCE_SUBMITTED = "EVIDENCE_SUBMITTED"
UNDER_AI_REVIEW = "UNDER_AI_REVIEW"
VERIFIED = "VERIFIED"
REVISION_REQUESTED = "REVISION_REQUESTED"
DISPUTED = "DISPUTED"
SETTLEMENT_RECOMMENDED = "SETTLEMENT_RECOMMENDED"

APPROVE = "APPROVE"
REVISE = "REVISE"
REJECT = "REJECT"
SPLIT_RECOMMENDED = "SPLIT_RECOMMENDED"

MAX_EVIDENCE_URL_LENGTH = 500
BLOCKED_HOST_PREFIXES = [
    "localhost",
    "127.",
    "10.",
    "192.168.",
    "172.16.",
    "172.17.",
    "172.18.",
    "172.19.",
    "172.20.",
    "172.21.",
    "172.22.",
    "172.23.",
    "172.24.",
    "172.25.",
    "172.26.",
    "172.27.",
    "172.28.",
    "172.29.",
    "172.30.",
    "172.31.",
    "169.254.",
    "0.",
]


class LexNetCommerceCore(gl.Contract):
    """
    Recommendation-only skeleton for LexNet commerce verification.

    V0 does not custody or transfer funds. It stores commerce cases, evidence,
    AI verification reports, and settlement recommendations so the product can
    be validated before payable escrow logic is added.
    """

    owner: Address
    next_case_id: u256
    case_ids: TreeMap[str, str]
    cases: TreeMap[str, str]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.next_case_id = u256(1)

    @gl.public.write
    def create_case(
        self,
        title: str,
        seller: str,
        agreement_text: str,
        acceptance_criteria_json: str,
        amount_reference: u256,
    ) -> str:
        if len(title.strip()) == 0:
            raise gl.vm.UserError("title is required")
        if len(seller.strip()) == 0:
            raise gl.vm.UserError("seller is required")
        if len(agreement_text.strip()) < 40:
            raise gl.vm.UserError("agreement_text must be at least 40 characters")
        if amount_reference <= u256(0):
            raise gl.vm.UserError("amount_reference must be greater than zero")

        criteria = self._parse_json_array(acceptance_criteria_json)
        if len(criteria) == 0:
            raise gl.vm.UserError("at least one acceptance criterion is required")

        case_id = f"lx-{str(self.next_case_id)}"
        self.next_case_id = self.next_case_id + u256(1)

        record = {
            "id": case_id,
            "title": title.strip(),
            "buyer": gl.message.sender_address.as_hex.lower(),
            "seller": seller.strip().lower(),
            "agreement_text": agreement_text.strip(),
            "acceptance_criteria": criteria,
            "amount_reference": int(amount_reference),
            "status": ACTIVE,
            "evidence_urls": [],
            "verification_report": None,
            "created_at": str(gl.block.number),
        }

        self.cases[case_id] = json.dumps(record, sort_keys=True)
        self.case_ids[case_id] = case_id
        return case_id

    @gl.public.write
    def submit_evidence(self, case_id: str, evidence_json: str) -> str:
        record = self._get_case_or_raise(case_id)
        if record["seller"] != gl.message.sender_address.as_hex.lower():
            raise gl.vm.UserError("only seller can submit evidence")
        if record["status"] not in [ACTIVE, REVISION_REQUESTED]:
            raise gl.vm.UserError("case is not ready for evidence")

        urls = self._parse_json_array(evidence_json)
        if len(urls) == 0:
            raise gl.vm.UserError("at least one evidence url is required")
        if len(urls) > 8:
            raise gl.vm.UserError("at most 8 evidence urls are allowed")

        normalized_urls: list[str] = []
        for raw_url in urls:
            url = str(raw_url).strip()
            self._validate_evidence_url(url)
            if url in normalized_urls:
                raise gl.vm.UserError("duplicate evidence urls are not allowed")
            normalized_urls.append(url)

        record["evidence_urls"] = normalized_urls
        record["status"] = EVIDENCE_SUBMITTED
        self.cases[case_id] = json.dumps(record, sort_keys=True)
        return "SUCCESS"

    @gl.public.write
    def verify_case(self, case_id: str) -> str:
        record = self._get_case_or_raise(case_id)
        if record["status"] != EVIDENCE_SUBMITTED:
            raise gl.vm.UserError("evidence has not been submitted")

        agreement_text = str(record["agreement_text"])
        acceptance_criteria = json.dumps(record["acceptance_criteria"])
        evidence_urls = record["evidence_urls"]

        def leader_fn():
            evidence_bundle = self._fetch_evidence_bundle(evidence_urls)
            prompt = f"""
You are LexNet's AI commerce verification engine.

Evaluate whether the seller delivered according to the commercial agreement.

Agreement:
{agreement_text}

Acceptance criteria:
{acceptance_criteria}

Evidence:
{evidence_bundle}

Return JSON only with exactly these keys:
- verdict: one of APPROVE, REVISE, REJECT, SPLIT_RECOMMENDED
- score: integer from 0 to 100
- summary: concise public explanation grounded in the evidence
- recommendation: concise settlement recommendation
- seller_share_bps: integer between 0 and 10000
"""
            return gl.nondet.exec_prompt(prompt, response_format="json")

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            validator_result = leader_fn()
            leader_data = leader_result.calldata
            if not self._valid_verification_result(leader_data):
                return False
            if not self._valid_verification_result(validator_result):
                return False
            if leader_data["verdict"] != validator_result["verdict"]:
                return False
            return abs(int(leader_data["score"]) - int(validator_result["score"])) <= 10

        record["status"] = UNDER_AI_REVIEW
        self.cases[case_id] = json.dumps(record, sort_keys=True)

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        seller_share_bps = self._normalize_seller_share(
            str(result["verdict"]), int(result["seller_share_bps"])
        )

        report = {
            "verdict": str(result["verdict"]),
            "score": int(result["score"]),
            "summary": str(result["summary"]),
            "recommendation": str(result["recommendation"]),
            "seller_share_bps": seller_share_bps,
            "reviewed_at": str(gl.block.number),
        }

        record["verification_report"] = report
        record["status"] = self._status_for_verdict(str(result["verdict"]))
        self.cases[case_id] = json.dumps(record, sort_keys=True)
        return json.dumps(report, sort_keys=True)

    @gl.public.view
    def get_case(self, case_id: str) -> str:
        return self.cases.get(str(case_id), "")

    @gl.public.view
    def list_case_ids(self) -> str:
        ids: list[str] = []
        for key in self.case_ids:
            ids.append(str(key))
        return json.dumps(ids)

    def _get_case_or_raise(self, case_id: str):
        record = self.cases.get(str(case_id), "")
        if record == "":
            raise gl.vm.UserError("case not found")
        return json.loads(record)

    def _fetch_evidence_bundle(self, evidence_urls: list[str]) -> str:
        fragments: list[str] = []
        for url in evidence_urls[:3]:
            response = gl.nondet.web.get(str(url))
            body = response.body.decode("utf-8")
            fragments.append(f"URL: {url}\nCONTENT:\n{body[:4000]}")
        return "\n\n---\n\n".join(fragments)

    def _validate_evidence_url(self, url: str):
        if len(url) > MAX_EVIDENCE_URL_LENGTH:
            raise gl.vm.UserError("evidence url is too long")

        normalized_url = url.lower()
        if not normalized_url.startswith("https://"):
            raise gl.vm.UserError("evidence urls must be https")

        without_scheme = url[len("https://"):]
        authority = without_scheme.split("/", 1)[0]
        if "@" in authority:
            raise gl.vm.UserError("invalid evidence host")
        if authority.startswith("["):
            raise gl.vm.UserError("invalid evidence host")

        host = authority.split(":", 1)[0].lower()
        if host == "":
            raise gl.vm.UserError("invalid evidence host")
        for prefix in BLOCKED_HOST_PREFIXES:
            if host == prefix.rstrip(".") or host.startswith(prefix):
                raise gl.vm.UserError("unsafe evidence host")

    def _parse_json_array(self, raw_value: str) -> list[str]:
        if raw_value == "":
            return []
        parsed = json.loads(raw_value)
        if not isinstance(parsed, list):
            raise gl.vm.UserError("expected JSON array")
        result: list[str] = []
        for item in parsed:
            result.append(str(item))
        return result

    def _valid_verification_result(self, result) -> bool:
        if not isinstance(result, dict):
            return False
        verdict = str(result.get("verdict", ""))
        if verdict not in [APPROVE, REVISE, REJECT, SPLIT_RECOMMENDED]:
            return False
        try:
            score = int(result.get("score", -1))
            seller_share_bps = int(result.get("seller_share_bps", -1))
        except Exception:
            return False
        if score < 0 or score > 100:
            return False
        if seller_share_bps < 0 or seller_share_bps > 10000:
            return False
        if not isinstance(result.get("summary", ""), str):
            return False
        return isinstance(result.get("recommendation", ""), str)

    def _normalize_seller_share(self, verdict: str, seller_share_bps: int) -> int:
        if verdict == APPROVE:
            return 10000
        if verdict == REJECT:
            return 0
        if seller_share_bps < 0:
            return 0
        if seller_share_bps > 10000:
            return 10000
        return seller_share_bps

    def _status_for_verdict(self, verdict: str) -> str:
        if verdict == APPROVE:
            return VERIFIED
        if verdict == REVISE:
            return REVISION_REQUESTED
        if verdict == REJECT:
            return DISPUTED
        return SETTLEMENT_RECOMMENDED
