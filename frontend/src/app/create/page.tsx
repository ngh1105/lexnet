"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import CreateEscrowModal from "@/components/CreateEscrowModal";
import { useRouter } from "next/navigation";

/**
 * /create route — opens create modal, redirects to detail on success.
 */
export default function CreatePage() {
    const router = useRouter();
    const [open, setOpen] = useState(true);

    return (
        <div style={{ display: "flex", width: "100%", minHeight: "100vh" }}>
            <Sidebar />
            <main
                style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#475569",
                    fontSize: 14,
                }}
            >
                {!open && <p>Redirecting…</p>}
            </main>
            <CreateEscrowModal
                isOpen={open}
                onClose={() => {
                    setOpen(false);
                    router.push("/");
                }}
                onCreated={(id) => {
                    setOpen(false);
                }}
            />
        </div>
    );
}
