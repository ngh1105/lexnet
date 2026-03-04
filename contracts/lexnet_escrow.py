# { "Depends": "py-genlayer:test" }

from genlayer import *
import json

class LexNetEscrow(gl.Contract):
    """
    LexNet Escrow Contract
    Autonomous AI-driven Escrow Protocol
    """

    owner: Address
    treasury: u256
    fee_basis_points: u256
    escrow_count: u256
    escrows: TreeMap[str, str]

    def __init__(self, fee_basis_points: u256):
        self.owner = gl.message.sender_address
        self.treasury = u256(0)
        self.fee_basis_points = fee_basis_points
        self.escrow_count = u256(0)

    @gl.public.write
    def create_escrow(self, freelancer_address: str, requirements_text: str) -> str:
        escrow_id = str(self.escrow_count)
        self.escrow_count = self.escrow_count + u256(1)

        client_address = gl.message.sender_address.as_hex.lower()

        self.escrows[escrow_id] = json.dumps({
            "id": escrow_id,
            "client": client_address,
            "freelancer": freelancer_address.lower(),
            "amount": "0",
            "fee_amount": "0",
            "requirements_text": requirements_text,
            "submitted_work_url": "",
            "status": "CREATED",
            "resolved_at": "0",
            "impact_score": 0,
            "is_approved": False
        }, sort_keys=True)
        return escrow_id

    @gl.public.write
    def fund_escrow(self, escrow_id: str, amount: u256) -> str:
        escrow_str = self.escrows.get(escrow_id, None)
        if escrow_str is None:
            return "Error: Escrow not found"
            
        escrow = json.loads(escrow_str)
        
        if escrow["status"] != "CREATED":
            return "Error: Escrow is not in CREATED state"
        if escrow["client"] != gl.message.sender_address.as_hex.lower():
            return "Error: Only the client can fund the escrow"
        if amount <= u256(0):
            return "Error: Funding amount must be greater than 0"

        amount_int = int(str(amount))
        fee_basis_int = int(str(self.fee_basis_points))
        fee_amount = (amount_int * fee_basis_int) // 10000

        escrow["amount"] = str(amount_int)
        escrow["fee_amount"] = str(fee_amount)
        escrow["status"] = "FUNDED"

        self.escrows[escrow_id] = json.dumps(escrow, sort_keys=True)
        return "SUCCESS"

    @gl.public.write
    def submit_work(self, escrow_id: str, work_url: str) -> str:
        escrow_str = self.escrows.get(escrow_id, None)
        if escrow_str is None:
            return "Error: Escrow not found"
            
        escrow = json.loads(escrow_str)
        
        if escrow["status"] != "FUNDED":
            return "Error: Escrow is not funded"
        if escrow["freelancer"] != gl.message.sender_address.as_hex.lower():
            return "Error: Only the freelancer can submit work"
        if work_url == "":
            return "Error: Work URL cannot be empty"

        escrow["submitted_work_url"] = work_url
        escrow["status"] = "WORK_SUBMITTED"

        self.escrows[escrow_id] = json.dumps(escrow, sort_keys=True)
        return "SUCCESS"

    @gl.public.write
    def evaluate_work(self, escrow_id: str) -> str:
        escrow_str = self.escrows.get(escrow_id, None)
        if escrow_str is None:
            return "Error: Escrow not found"
        
        escrow = json.loads(escrow_str)
        
        if escrow["status"] != "WORK_SUBMITTED":
            return "Error: Work has not been submitted yet"

        # Set transitional state
        escrow["status"] = "AI_EVALUATING"
        self.escrows[escrow_id] = json.dumps(escrow, sort_keys=True)
        
        req_text = escrow["requirements_text"]
        work_url = escrow["submitted_work_url"]

        input_text = "Client Requirements: " + req_text + "\nSubmitted Work URL: " + work_url

        task = f"""You are LexNet's AI Arbitration Engine.
Evaluate if the work meets the client's requirements.
Based on your knowledge of the work provided in the input URL and the original requirements,
return ONLY '1' if the work is acceptable and meets all requirements.
return ONLY '0' if the work is unacceptable, broken, or fails to meet requirements.
Do not output any other text."""

        criteria = "Output MUST be strictly '1' or '0'."

        score_raw = gl.eq_principle.prompt_non_comparative(
            lambda: input_text,
            task=task,
            criteria=criteria,
        )

        try:
            score = int(score_raw.strip())
            is_approved = (score == 1)
        except Exception:
            score = 0
            is_approved = False

        net_amount_int = int(escrow["amount"]) - int(escrow["fee_amount"])

        if is_approved:
            # Transfer to freelancer (In a real environment: gl.transfer(Address(escrow["freelancer"]), u256(net_amount_int)))
            pass
        else:
            # Refund client (In a real environment: gl.transfer(Address(escrow["client"]), u256(net_amount_int)))
            pass

        self.treasury = self.treasury + u256(int(escrow["fee_amount"]))
        escrow["status"] = "RESOLVED"
        escrow["impact_score"] = score
        escrow["is_approved"] = is_approved
        
        self.escrows[escrow_id] = json.dumps(escrow, sort_keys=True)
        return score_raw

    @gl.public.view
    def get_escrow(self, escrow_id: str) -> str:
        result = self.escrows.get(escrow_id, None)
        if result is None:
            return "Error: Escrow not found"
        return result

    @gl.public.view
    def get_treasury(self) -> str:
        return str(self.treasury)

    @gl.public.write
    def withdraw_fees(self) -> str:
        if gl.message.sender_address.as_hex.lower() != self.owner.as_hex.lower():
            return "Error: Only the owner can withdraw fees"
        
        amount_to_withdraw = self.treasury
        
        if amount_to_withdraw <= u256(0):
            return "Error: No fees to withdraw"
        
        self.treasury = u256(0)
        # gl.transfer(self.owner, amount_to_withdraw)
        return "SUCCESS"
