import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import useAdminQueue from "@/features/admin/hooks/useAdminQueue";
import "@/features/admin/layout/AdminLayout.css";

export default function AdminLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { counts } = useAdminQueue({ includeItems: false });

  const badges = {
    queue: counts.submittedProperties + counts.openChangeRequests + counts.pendingInvestors,
    properties: counts.submittedProperties + counts.openChangeRequests,
    investors: counts.pendingInvestors,
    inquiries: counts.failedInquiries,
  };

  function handleLogout() {
    signOut();
    navigate("/", { replace: true })
  }

  return (
    <div className="adminShell">
      <aside className="adminSidebar">
        <div className="adminBrand">
          <Link to="/" aria-label="Megna homepage">
            <img
              src="/favicon.svg"
              alt="Megna"
              className="adminBrand__logo"
            />
          </Link>
        </div>

        <nav className="adminNav" aria-label="Admin navigation">
          <NavLink
            to="queue"
            className={({ isActive }) =>
              `adminNav__link ${isActive ? "adminNav__link--active" : ""}`
            }
          >
            <span>Queue</span>
            {badges.queue > 0 ? <span className="adminNav__badge">{badges.queue}</span> : null}
          </NavLink>
          <NavLink
            to="properties"
            className={({ isActive }) =>
              `adminNav__link ${isActive ? "adminNav__link--active" : ""}`
            }
          >
            <span>Properties</span>
            {badges.properties > 0 ? <span className="adminNav__badge">{badges.properties}</span> : null}
          </NavLink>
          <NavLink
            to="investors"
            className={({ isActive }) =>
              `adminNav__link ${isActive ? "adminNav__link--active" : ""}`
            }
          >
            <span>Investors</span>
            {badges.investors > 0 ? <span className="adminNav__badge">{badges.investors}</span> : null}
          </NavLink>
          <NavLink
            to="inquiries"
            className={({ isActive }) =>
              `adminNav__link ${isActive ? "adminNav__link--active" : ""}`
            }
          >
            <span>Inquiries</span>
            {badges.inquiries > 0 ? <span className="adminNav__badge">{badges.inquiries}</span> : null}
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
