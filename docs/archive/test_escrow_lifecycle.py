import json
import unittest


class EscrowModel:
    def __init__(self, fee_basis_points=250):
        self.owner = "0xowner"
        self.treasury = 0
        self.fee_basis_points = fee_basis_points
        self.escrow_count = 0
        self.escrows = {}

    def create_escrow(self, sender, freelancer_address, requirements_text):
        escrow_id = str(self.escrow_count)
        self.escrow_count += 1
        self.escrows[escrow_id] = json.dumps(
            {
                "id": escrow_id,
                "client": sender.lower(),
                "freelancer": freelancer_address.lower(),
                "amount": "0",
                "fee_amount": "0",
                "requirements_text": requirements_text,
                "submitted_work_url": "",
                "status": "CREATED",
                "resolved_at": "0",
                "impact_score": 0,
                "is_approved": False,
            },
            sort_keys=True,
        )
        return escrow_id

    def get_escrow(self, escrow_id):
        return self.escrows.get(escrow_id)

    def fund_escrow(self, sender, escrow_id, amount):
        escrow_str = self.escrows.get(escrow_id)
        if escrow_str is None:
            return "Error: Escrow not found"
        escrow = json.loads(escrow_str)
        if escrow["status"] != "CREATED":
            return "Error: Escrow is not in CREATED state"
        if escrow["client"] != sender.lower():
            return "Error: Only the client can fund the escrow"
        if amount <= 0:
            return "Error: Funding amount must be greater than 0"

        fee_amount = (amount * self.fee_basis_points) // 10000
        escrow["amount"] = str(amount)
        escrow["fee_amount"] = str(fee_amount)
        escrow["status"] = "FUNDED"
        self.escrows[escrow_id] = json.dumps(escrow, sort_keys=True)
        return "SUCCESS"

    def submit_work(self, sender, escrow_id, work_url):
        escrow_str = self.escrows.get(escrow_id)
        if escrow_str is None:
            return "Error: Escrow not found"
        escrow = json.loads(escrow_str)
        if escrow["status"] != "FUNDED":
            return "Error: Escrow is not funded"
        if escrow["freelancer"] != sender.lower():
            return "Error: Only the freelancer can submit work"
        if work_url == "":
            return "Error: Work URL cannot be empty"

        escrow["submitted_work_url"] = work_url
        escrow["status"] = "WORK_SUBMITTED"
        self.escrows[escrow_id] = json.dumps(escrow, sort_keys=True)
        return "SUCCESS"

    def evaluate_work(self, escrow_id, score_raw="1"):
        escrow_str = self.escrows.get(escrow_id)
        if escrow_str is None:
            return "Error: Escrow not found"
        escrow = json.loads(escrow_str)
        if escrow["status"] != "WORK_SUBMITTED":
            return "Error: Work has not been submitted yet"

        try:
            score = int(score_raw.strip())
            is_approved = score == 1
        except Exception:
            score = 0
            is_approved = False

        self.treasury += int(escrow["fee_amount"])
        escrow["status"] = "RESOLVED"
        escrow["impact_score"] = score
        escrow["is_approved"] = is_approved
        self.escrows[escrow_id] = json.dumps(escrow, sort_keys=True)
        return score_raw


class TestEscrowLifecycle(unittest.TestCase):
    def setUp(self):
        self.contract = EscrowModel(fee_basis_points=250)
        self.client = "0xClientABC"
        self.freelancer = "0xFreelancerDEF"

    def test_create_escrow_and_read_back(self):
        escrow_id = self.contract.create_escrow(
            self.client,
            self.freelancer,
            "Build a responsive landing page.",
        )

        escrow = json.loads(self.contract.get_escrow(escrow_id))
        self.assertEqual(escrow["id"], "0")
        self.assertEqual(escrow["client"], self.client.lower())
        self.assertEqual(escrow["freelancer"], self.freelancer.lower())
        self.assertEqual(escrow["status"], "CREATED")
        self.assertEqual(escrow["amount"], "0")

    def test_fund_escrow_updates_amount_fee_and_status(self):
        escrow_id = self.contract.create_escrow(self.client, self.freelancer, "API work")
        result = self.contract.fund_escrow(self.client, escrow_id, 1_000_000)

        escrow = json.loads(self.contract.get_escrow(escrow_id))
        self.assertEqual(result, "SUCCESS")
        self.assertEqual(escrow["status"], "FUNDED")
        self.assertEqual(escrow["amount"], "1000000")
        self.assertEqual(escrow["fee_amount"], "25000")

    def test_submit_work_preserves_existing_fields(self):
        escrow_id = self.contract.create_escrow(self.client, self.freelancer, "Ship repo")
        self.contract.fund_escrow(self.client, escrow_id, 2_000_000)
        result = self.contract.submit_work(
            self.freelancer,
            escrow_id,
            "https://github.com/example/project",
        )

        escrow = json.loads(self.contract.get_escrow(escrow_id))
        self.assertEqual(result, "SUCCESS")
        self.assertEqual(escrow["status"], "WORK_SUBMITTED")
        self.assertEqual(escrow["submitted_work_url"], "https://github.com/example/project")
        self.assertEqual(escrow["amount"], "2000000")
        self.assertEqual(escrow["requirements_text"], "Ship repo")

    def test_evaluate_work_records_resolution_and_treasury(self):
        escrow_id = self.contract.create_escrow(self.client, self.freelancer, "Create docs")
        self.contract.fund_escrow(self.client, escrow_id, 4_000_000)
        self.contract.submit_work(self.freelancer, escrow_id, "https://example.com/docs")
        result = self.contract.evaluate_work(escrow_id, score_raw="1")

        escrow = json.loads(self.contract.get_escrow(escrow_id))
        self.assertEqual(result, "1")
        self.assertEqual(escrow["status"], "RESOLVED")
        self.assertEqual(escrow["impact_score"], 1)
        self.assertTrue(escrow["is_approved"])
        self.assertEqual(self.contract.treasury, 100000)

    def test_rejects_invalid_state_transitions(self):
        escrow_id = self.contract.create_escrow(self.client, self.freelancer, "Create docs")

        self.assertEqual(
            self.contract.submit_work(self.freelancer, escrow_id, "https://example.com"),
            "Error: Escrow is not funded",
        )
        self.assertEqual(
            self.contract.evaluate_work(escrow_id),
            "Error: Work has not been submitted yet",
        )
        self.assertEqual(
            self.contract.fund_escrow("0xSomeoneElse", escrow_id, 1_000),
            "Error: Only the client can fund the escrow",
        )


if __name__ == "__main__":
    unittest.main()
