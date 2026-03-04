# LexNet

**Autonomous AI-Driven Arbitration & Escrow Protocol** built on [GenLayer](https://www.genlayer.com/) — the AI-native trust layer for smart contracts.

LexNet replaces human arbitrators in freelance and digital-service agreements with a **trustless, on-chain AI arbiter** that evaluates deliverables against client requirements and releases escrow automatically.

---

## Features

- **AI evaluation** — On-chain LLM reviews submitted work against the client's requirements document
- **Web data access** — Contract fetches live URLs (deployed sites, repos) for AI review without oracles or API keys
- **Subjective consensus** — GenLayer validators reach decentralized consensus on approval via the Equivalence Principle
- **Full lifecycle** — Create → Fund → Submit work → AI evaluates → Funds released to freelancer or refunded to client

---

## Architecture

| Component | Description |
|-----------|-------------|
| **`contracts/lexnet_escrow.py`** | GenLayer Intelligent Contract (Python/GenVM). Manages escrow state, fees, and AI evaluation flow. |
| **`frontend/`** | Next.js 16 app with RainbowKit, wagmi, GenLayerJS. Dashboard to create escrows, fund, submit work, view status. |
| **`genlayer-js/`** | GenLayer JavaScript SDK — wallet connection, contract reads/writes, chain config. |

**Escrow states:** `CREATED` → `FUNDED` → `WORK_SUBMITTED` → (AI evaluation) → `RESOLVED`

See [ARCHITECTURE.md](./ARCHITECTURE.md) for state machine, data schema, and AI consensus design.

---

## Prerequisites

- **Node.js** 18+ (for frontend)
- **Python** 3.11+ (for contract tooling; contract runs in GenVM)
- **GenLayer** — localnet/studionet for deployment and testing
- **MetaMask** (or compatible wallet) with GenLayer network configured

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/ngh1105/lexnet.git
cd lexnet
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Connect wallet to your GenLayer RPC (e.g. localnet).

### 3. Contract (GenLayer)

Deploy the Intelligent Contract to your GenLayer network using the GenLayer CLI or SDK. Constructor argument: `fee_basis_points` (e.g. `250` = 2.5% protocol fee).

See [GenLayer docs](https://docs.genlayer.com/) for deployment and chain configuration.

### 4. Configure frontend

Point the app to your deployed contract address and GenLayer RPC in `frontend/src/lib/genlayer.ts` (or env) as needed.

---

## Project Structure

```
lexnet/
├── contracts/
│   └── lexnet_escrow.py    # GenLayer Intelligent Contract
├── frontend/               # Next.js + RainbowKit + GenLayerJS
│   ├── src/
│   │   ├── app/            # Pages (dashboard, create, escrow detail)
│   │   ├── components/     # UI (Sidebar, EscrowCard, CreateEscrowModal, …)
│   │   ├── lib/            # GenLayer client & contract calls
│   │   └── providers/      # Web3Provider
│   └── package.json
├── genlayer-js/            # GenLayer JavaScript SDK (dependency)
├── ARCHITECTURE.md         # Escrow lifecycle, schema, AI consensus
├── test-api.js             # API/test utilities
└── README.md
```

---

## Tech Stack

- **Contract:** Python (GenLayer/GenVM), `gl.nondet` for AI & web access
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, Framer Motion, Phosphor Icons
- **Web3:** RainbowKit, wagmi, viem, GenLayerJS

---

## Design principle

> **"The contract evaluates. The protocol arbitrates."**

The contract is responsible for escrow lifecycle and producing a deterministic verdict (`is_approved`). The GenLayer protocol handles multi-validator consensus, challenge window, and slashing — no custom appeal/jury logic in the contract.

---

## License

See repository and subfolders for license information.
