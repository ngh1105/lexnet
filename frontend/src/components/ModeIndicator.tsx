"use client";

import { Database, Desktop, WifiHigh } from "@phosphor-icons/react";
import { getDataMode } from "@/lib/genlayer";
import { useState } from "react";

export default function ModeIndicator() {
	const mode = getDataMode();
	const [dismissed, setDismissed] = useState(false);

	if (dismissed && mode === "local") return null;

	if (mode === "contract") {
		return (
			<div style={bannerStyle("rgba(16,185,129,0.08)", "rgba(16,185,129,0.25)", "#34D399")}>
				<WifiHigh size={14} weight="fill" color="#34D399" />
				<span>
					<strong>Contract Mode</strong> — Connected to deployed GenLayer contract. All operations are on-chain.
				</span>
			</div>
		);
	}

	if (mode === "backend") {
		return (
			<div style={bannerStyle("rgba(59,130,246,0.08)", "rgba(59,130,246,0.25)", "#60A5FA")}>
				<Database size={14} weight="fill" color="#60A5FA" />
				<span>
					<strong>Backend Mode</strong> — Cases, evidence, reports, and audit events persist through Next.js API storage.
				</span>
			</div>
		);
	}

	return (
		<div style={bannerStyle("rgba(245,158,11,0.08)", "rgba(245,158,11,0.25)", "#FCD34D")}>
			<Desktop size={14} weight="fill" color="#FCD34D" />
			<span>
				<strong>Local Mode</strong> — Using mock data. Set{" "}
				<code style={codeStyle}>NEXT_PUBLIC_LEXNET_DATA_MODE=backend</code> for persisted backend mode or{" "}
				<code style={codeStyle}>NEXT_PUBLIC_LEXNET_CONTRACT_ADDRESS</code> for contract mode.
			</span>
			<button onClick={() => setDismissed(true)} style={dismissStyle} title="Dismiss">
				&times;
			</button>
		</div>
	);
}

function bannerStyle(background: string, border: string, color: string): React.CSSProperties {
	return {
		marginBottom: 20,
		padding: "10px 16px",
		borderRadius: 10,
		background,
		border: `1px solid ${border}`,
		display: "flex",
		alignItems: "center",
		gap: 8,
		fontSize: 12,
		color,
	};
}

const codeStyle: React.CSSProperties = {
	fontFamily: "monospace",
	background: "rgba(245,158,11,0.1)",
	padding: "1px 5px",
	borderRadius: 4,
};

const dismissStyle: React.CSSProperties = {
	marginLeft: "auto",
	background: "transparent",
	border: "none",
	color: "#FCD34D",
	cursor: "pointer",
	padding: 2,
	opacity: 0.7,
};
