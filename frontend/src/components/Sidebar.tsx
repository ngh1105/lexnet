"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Scales,
    House,
    Plus,
    GithubLogo,
    Lightning,
} from "@phosphor-icons/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const navItems = [
    { href: "/", icon: House, label: "Dashboard" },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside
            className="glass-card flex flex-col"
            style={{
                width: 240,
                minHeight: "100vh",
                borderRadius: 0,
                borderTop: "none",
                borderLeft: "none",
                borderBottom: "none",
                borderRight: "1px solid rgba(59,130,246,0.12)",
                background: "rgba(6,13,26,0.7)",
                flexShrink: 0,
            }}
        >
            {/* Logo */}
            <div
                style={{
                    padding: "28px 24px 24px",
                    borderBottom: "1px solid rgba(59,130,246,0.1)",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: "linear-gradient(135deg, #3B82F6, #10B981)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
                        }}
                    >
                        <Scales size={20} weight="duotone" color="#fff" />
                    </div>
                    <div>
                        <div
                            style={{
                                fontWeight: 700,
                                fontSize: 16,
                                letterSpacing: "-0.3px",
                                color: "#E2E8F0",
                            }}
                        >
                            LexNet
                        </div>
                        <div style={{ fontSize: 10, color: "#475569", fontWeight: 500 }}>
                            Escrow Protocol
                        </div>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: "16px 12px" }}>
                {navItems.map(({ href, icon: Icon, label }) => {
                    const isActive = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "10px 12px",
                                borderRadius: 10,
                                marginBottom: 4,
                                textDecoration: "none",
                                fontWeight: 500,
                                fontSize: 14,
                                transition: "background 0.15s, color 0.15s",
                                background: isActive
                                    ? "rgba(59,130,246,0.12)"
                                    : "transparent",
                                color: isActive ? "#60A5FA" : "#94A3B8",
                                borderLeft: isActive ? "2px solid #3B82F6" : "2px solid transparent",
                            }}
                        >
                            <Icon
                                size={18}
                                weight={isActive ? "fill" : "regular"}
                                color={isActive ? "#60A5FA" : "#94A3B8"}
                            />
                            {label}
                        </Link>
                    );
                })}

                {/* Create Escrow Button */}
                <Link
                    href="/create"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 10,
                        marginTop: 8,
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: 14,
                        background: "rgba(59,130,246,0.15)",
                        color: "#60A5FA",
                        border: "1px solid rgba(59,130,246,0.25)",
                        transition: "background 0.15s, border-color 0.15s",
                    }}
                >
                    <Plus size={18} weight="bold" />
                    New Escrow
                </Link>
            </nav>

            {/* Wallet Connect */}
            <div style={{ padding: "0 16px 16px", display: "flex", justifyContent: "center" }}>
                <ConnectButton
                    showBalance={false}
                    chainStatus="icon"
                    accountStatus={{
                        smallScreen: 'avatar',
                        largeScreen: 'full',
                    }}
                />
            </div>

            {/* Footer */}
            <div
                style={{
                    padding: "16px 20px",
                    borderTop: "1px solid rgba(59,130,246,0.1)",
                }}
            >
                {/* GenLayer Badge */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "rgba(16,185,129,0.08)",
                        border: "1px solid rgba(16,185,129,0.2)",
                        marginBottom: 12,
                    }}
                >
                    <Lightning size={14} weight="fill" color="#34D399" />
                    <span style={{ fontSize: 11, color: "#34D399", fontWeight: 500 }}>
                        Powered by GenLayer AI
                    </span>
                </div>
                <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "#475569",
                        fontSize: 12,
                        textDecoration: "none",
                        transition: "color 0.15s",
                    }}
                >
                    <GithubLogo size={14} />
                    View on GitHub
                </a>
            </div>
        </aside>
    );
}
