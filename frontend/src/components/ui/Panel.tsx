import type { ReactNode } from "react";

export default function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="panel">
      <h2 className="section-label" style={{ marginBottom: 14 }}>
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
