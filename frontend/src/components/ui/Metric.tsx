export default function Metric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: "10px 11px",
        border: "1px solid var(--border)",
        borderRadius: 8,
        background: "var(--surface-subtle)",
      }}
    >
      <div style={{ color: "var(--muted)", fontSize: 11, fontWeight: 700 }}>{label}</div>
      <div
        className={mono ? "mono" : ""}
        style={{
          marginTop: 4,
          color: "var(--ink)",
          fontSize: 13,
          fontWeight: 800,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}
