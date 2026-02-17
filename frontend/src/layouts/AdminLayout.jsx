import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth";
import "./AdminLayout.css";

export default function AdminLayout() {
  const { signOut } = useAuth();

  function handleLogout() {
    window.sessionStorage.setItem("mv:admin:logged-out", "1");
    signOut();
  }

  return (
    <div className="adminShell">
      <aside className="adminSidebar">
        <div className="adminBrand">
          <img
            src="/favicon.svg"
            alt="Megna"
            className="adminBrand__logo"
          />
        </div>

        <nav className="adminNav" aria-label="Admin navigation">
          <NavLink
            to="properties"
            className={({ isActive }) =>
              `adminNav__link ${isActive ? "adminNav__link--active" : ""}`
            }
          >
            Properties
          </NavLink>
          <NavLink
            to="investors"
            className={({ isActive }) =>
              `adminNav__link ${isActive ? "adminNav__link--active" : ""}`
            }
          >
            Investors
          </NavLink>
          <NavLink
            to="inquiries"
            className={({ isActive }) =>
              `adminNav__link ${isActive ? "adminNav__link--active" : ""}`
            }
          >
            Inquiries
          </NavLink>
        </nav>

        <div className="adminSidebar__spacer" />

        <button className="adminLogout" type="button" onClick={handleLogout}>
          Log Out
        </button>
      </aside>

      <main className="adminMain">
        <Outlet />
      </main>
    </div>
  );
}
