import { Outlet } from "react-router-dom";

export default function InvestorLayout() {
  return (
    <div style={{ height: "100%", display: "grid", gridTemplateRows: "60px 1fr" }}>
      <header style={{ borderBottom: "1px solid var(--border-muted)", padding: "0 16px", display: "flex", alignItems: "center" }}>
        <b>Megna</b>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
          <button>Profile</button>
          <button>Inquiries</button>
        </div>
      </header>

      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}
