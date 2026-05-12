"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FilePlus2,
  IdCard,
  Inbox,
  Scale,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/", icon: Inbox, label: "Cases" },
  { href: "/cases/new", icon: FilePlus2, label: "New Case" },
  { href: "/passports", icon: IdCard, label: "Passports" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="sidebar-shell"
      style={{
        display: "flex",
        flexDirection: "column",
        color: "#fafafa",
      }}
    >
      <div style={{ padding: "24px 18px 18px" }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            color: "inherit",
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              display: "grid",
              placeItems: "center",
              background: "#f7f5f0",
              color: "var(--charcoal)",
            }}
          >
            <Scale size={19} strokeWidth={1.75} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1 }}>
              LexNet
            </div>
            <div
              style={{
                marginTop: 4,
                color: "rgba(250,250,250,0.55)",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              Commerce Trust
            </div>
          </div>
        </Link>
      </div>

      <nav style={{ flex: 1, padding: "10px 10px" }}>
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive =
            pathname === href || (href !== "/" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minHeight: 40,
                marginBottom: 4,
                padding: "0 12px",
                borderRadius: 8,
                color: isActive ? "#ffffff" : "rgba(250,250,250,0.64)",
                background: isActive ? "rgba(15,118,110,0.34)" : "transparent",
                border: isActive
                  ? "1px solid rgba(45,212,191,0.24)"
                  : "1px solid transparent",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 700,
                transition: "background 0.16s ease, color 0.16s ease",
              }}
            >
              <Icon size={17} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: 14, display: "grid", gap: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "10px 11px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Zap size={15} color="#5eead4" fill="#5eead4" strokeWidth={1.75} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 800 }}>Local MVP</div>
            <div style={{ color: "rgba(250,250,250,0.54)", fontSize: 11 }}>
              GenLayer Ready
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
