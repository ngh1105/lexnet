import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "@/providers/Web3Provider";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LexNet Escrow — AI-Powered Arbitration Protocol",
  description:
    "Autonomous AI-driven escrow on GenLayer. Trustless freelance agreements arbitrated by on-chain AI consensus.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div style={{
          minHeight: "100vh",
          background: "radial-gradient(ellipse at top, #0B162C 0%, #030712 100%)",
          color: "#E2E8F0",
          display: "flex",
          flexDirection: "column",
        }}>
          <Web3Provider>
            {children}
          </Web3Provider>
        </div>
      </body>
    </html>
  );
}
