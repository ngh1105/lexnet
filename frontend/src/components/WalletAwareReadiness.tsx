"use client";

import { useAccount } from "wagmi";
import ContractCallPreview from "@/components/ContractCallPreview";
import ContractReadinessPanel from "@/components/ContractReadinessPanel";
import {
  buildSubmitEvidenceCallPreview,
  buildVerifyCaseCallPreview,
  getLexNetContractReadiness,
  type LexNetContractEnvironment,
} from "@/lib/lexnet-contract";
import type { CommerceCase } from "@/lib/lexnet-types";

export function WalletAwareDashboardReadiness({
  contractEnvironment,
}: {
  contractEnvironment: LexNetContractEnvironment;
}) {
  const { address, isConnected } = useAccount();
  const readiness = getReadiness(contractEnvironment, isConnected, address);

  return <ContractReadinessPanel readiness={readiness} compact />;
}

export function WalletUnavailableDashboardReadiness({
  contractEnvironment,
}: {
  contractEnvironment: LexNetContractEnvironment;
}) {
  const readiness = getReadiness(contractEnvironment, false);

  return <ContractReadinessPanel readiness={readiness} compact />;
}

export function WalletAwareCaseReadiness({
  commerceCase,
  evidenceInput,
  contractEnvironment,
  onCopy,
}: {
  commerceCase: CommerceCase;
  evidenceInput: string;
  contractEnvironment: LexNetContractEnvironment;
  onCopy: (message: string) => void;
}) {
  const { address, isConnected } = useAccount();
  const readiness = getReadiness(contractEnvironment, isConnected, address);
  const preview = buildPreview(commerceCase, evidenceInput, readiness);

  return (
    <>
      <ContractReadinessPanel readiness={readiness} />
      <ContractCallPreview preview={preview} onCopy={onCopy} />
    </>
  );
}

export function WalletUnavailableCaseReadiness({
  commerceCase,
  evidenceInput,
  contractEnvironment,
  onCopy,
}: {
  commerceCase: CommerceCase;
  evidenceInput: string;
  contractEnvironment: LexNetContractEnvironment;
  onCopy: (message: string) => void;
}) {
  const readiness = getReadiness(contractEnvironment, false);
  const preview = buildPreview(commerceCase, evidenceInput, readiness);

  return (
    <>
      <ContractReadinessPanel readiness={readiness} />
      <ContractCallPreview preview={preview} onCopy={onCopy} />
    </>
  );
}

function getReadiness(
  contractEnvironment: LexNetContractEnvironment,
  walletConnected: boolean,
  connectedWalletAddress?: string,
) {
  return getLexNetContractReadiness({
    env: {
      NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS: contractEnvironment.contractAddress ?? "",
      NEXT_PUBLIC_GENLAYER_RPC_URL: contractEnvironment.rpcUrl,
      NEXT_PUBLIC_GENLAYER_NETWORK_LABEL: contractEnvironment.networkLabel,
      NEXT_PUBLIC_LEXNET_OWNER_WALLET_ADDRESS: process.env.NEXT_PUBLIC_LEXNET_OWNER_WALLET_ADDRESS,
    },
    walletConnected,
    connectedWalletAddress,
  });
}

function buildPreview(
  commerceCase: CommerceCase,
  evidenceInput: string,
  readiness: ReturnType<typeof getLexNetContractReadiness>,
) {
  const evidenceUrls = evidenceInput
    .split(/\r?\n|,/)
    .map((url) => url.trim())
    .filter(Boolean);

  return evidenceInput.trim()
    ? buildSubmitEvidenceCallPreview(commerceCase, evidenceUrls, readiness)
    : buildVerifyCaseCallPreview(commerceCase, readiness);
}
