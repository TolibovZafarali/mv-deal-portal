import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import "@/features/seller/layout/SellerLayout.css";

function linkClass(isActive) {
  return `sellerNav__link ${isActive ? "sellerNav__link--active" : ""}`;
}

export default function SellerLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    signOut();
    navigate("/", { replace: true });
  }

  return (
    <div className="sellerShell">
      <aside className="sellerSidebar">
        <div className="sellerBrand">
          <img src="/favicon.svg" alt="Megna" className="sellerBrand__logo" />
          <div className="sellerBrand__label">Seller Portal</div>
        </div>

        <nav className="sellerNav" aria-label="Seller navigation">
          <NavLink to="listings" className={({ isActive }) => linkClass(isActive)}>
            Listings
          </NavLink>
          <NavLink to="inbox" className={({ isActive }) => linkClass(isActive)}>
            Inbox
          </NavLink>
          <NavLink to="profile" className={({ isActive }) => linkClass(isActive)}>
            Profile
          </NavLink>
        </nav>

        <div className="sellerSidebar__spacer" />

        <button className="sellerLogout" type="button" onClick={handleLogout}>
          Log Out
        </button>
      </aside>

      <main className="sellerMain">
        <Outlet />
      </main>
    </div>
  );
}
