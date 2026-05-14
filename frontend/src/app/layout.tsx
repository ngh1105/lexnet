import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Web3Provider } from "@/providers/Web3Provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LexNet Commerce Trust",
  description:
    "AI-verified commerce trust cases, evidence review, settlement recommendations, and portable trust history.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div
          style={{
            minHeight: "100vh",
            background: "#f7f5f0",
            color: "#111827",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Web3Provider>{children}</Web3Provider>
        </div>
      </body>
    </html>
  );
}
