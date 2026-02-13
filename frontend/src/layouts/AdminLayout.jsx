import { NavLink, Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", height: "100%" }}>
      <aside style={{ borderRight: "1px solid var(--border-muted)", padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Admin</h3>

        <nav style={{ display: "grid", gap: 10 }}>
          <NavLink to="properties">Properties</NavLink>
          <NavLink to="investors">Investors</NavLink>
          <NavLink to="inquiries">Inquiries</NavLink>
        </nav>
      </aside>

      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}
