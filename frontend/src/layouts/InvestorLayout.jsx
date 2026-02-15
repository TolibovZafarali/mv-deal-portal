import { Outlet } from "react-router-dom"

const shellStyle = { height: "100%", display: "grid", gridTemplateRows: "60px 1fr" }
const headerStyle = {
  borderBottom: "1px solid var(--border-muted)",
  padding: "0 16px",
  display: "flex",
  alignItems: "center",
}
const actionsStyle = { marginLeft: "auto", display: "flex", gap: 12 }
const mainStyle = { padding: 16 }

export default function InvestorLayout() {
  return (
    <div style={shellStyle}>
      <header style={headerStyle}>
        <b>Megna</b>
        <div style={actionsStyle}>
          <button>Profile</button>
          <button>Inquiries</button>
        </div>
      </header>

      <main style={mainStyle}>
        <Outlet />
      </main>
    </div>
  )
}
