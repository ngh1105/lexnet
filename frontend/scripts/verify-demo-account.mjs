import crypto from "node:crypto";
import { createAccount } from "genlayer-js";

const MOCK_ESCROW_IDS = ["0", "1", "2", "3"];

const checksum = (input) => crypto.createHash("sha256").update(input).digest("hex");

const mode = process.env.NEXT_PUBLIC_LEXNET_DATA_MODE || "local";
const contractAddress = process.env.NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS || "";
const demoAccount = createAccount();

const payload = {
  mode,
  contractAddress,
  demoAccount: {
    address: demoAccount.address.toLowerCase(),
    privateKeyRef: `local-demo:${checksum(demoAccount.address).slice(0, 16)}`,
  },
  mockEscrowIds: MOCK_ESCROW_IDS,
};

process.stdout.write(JSON.stringify(payload));
