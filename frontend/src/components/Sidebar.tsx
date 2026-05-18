"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FilePlus2,
  IdCard,
  Inbox,
  Scale,
  ShieldCheck,
  Zap,
} from "@/components/icons";

const navItems = [
  { href: "/", icon: Inbox, label: "Cases" },
  { href: "/cases/new", icon: FilePlus2, label: "New Case" },
  { href: "/passports", icon: IdCard, label: "Passports" },
  { href: "/platform", icon: ShieldCheck, label: "Platform" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        className="sidebar-mobile-toggle"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span
          aria-hidden
          style={{
            display: "grid",
            gap: 4,
          }}
        >
          <span style={{ display: "block", width: 18, height: 2, background: "currentColor", borderRadius: 2 }} />
          <span style={{ display: "block", width: 18, height: 2, background: "currentColor", borderRadius: 2 }} />
          <span style={{ display: "block", width: 18, height: 2, background: "currentColor", borderRadius: 2 }} />
        </span>
      </button>
      <div
        className={`sidebar-mobile-overlay${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <aside
        className={`sidebar-shell${open ? " open" : ""}`}
        style={{
          display: "flex",
          flexDirection: "column",
          color: "#fafafa",
        }}
      >
        <div className="sidebar-brand">
          <Link href="/" className="sidebar-brand-link">
            <div className="sidebar-logo">
              <Scale size={20} strokeWidth={1.75} />
            </div>
            <div>
              <div className="sidebar-kicker">Commerce Trust</div>
              <div className="sidebar-title">LexNet</div>
            </div>
          </Link>
          <div className="sidebar-pilot-badge">
            <span>Live Workspace</span>
            <ShieldCheck size={14} strokeWidth={1.75} />
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-group-label">Operator Workspace</div>
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive =
              pathname === href || (href !== "/" && pathname.startsWith(href));

            return (
              <Link
                key={href}
                href={href}
                className={`sidebar-nav-link${isActive ? " active" : ""}`}
              >
                <Icon size={17} strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-status-card">
            <Zap size={16} color="#5eead4" fill="#5eead4" strokeWidth={1.75} />
            <div>
              <div className="sidebar-status-title">Command Center</div>
              <div className="sidebar-status-copy">
                Recommendation-only review. No custody or payout execution.
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
