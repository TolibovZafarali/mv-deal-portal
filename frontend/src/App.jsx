import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom"
import ApiSmokeTest from "./pages/ApiSmokeTest"
import { ProtectedRoute, useAuth } from "./auth";
import LoginModal from "./modals/LoginModal";
import AdminLayout from "./layouts/AdminLayout";
import AdminPropertiesPage from "./pages/admin/AdminPropertiesPage";
import AdminInvestorsPage from "./pages/admin/AdminInvestorPage";
import AdminInquiriesPage from "./pages/admin/AdminInquiriesPage";
import InvestorLayout from "./layouts/InvestorLayout";
import InvestorDashboard from "./pages/investor/InvestorDashboard";
import InvestorPending from "./pages/investor/InvestorPending";
import AppRedirect from "./pages/AppRedirect";

function Home() {
  const location = useLocation();
  const { isAuthed, bootstrapping } = useAuth();
  
  // Don't flash homepage while the app is still checking the token
  if (bootstrapping) {
    return <div style={{ padding: "28px 18px "}}>Loading...</div>;
  }

  // If token is valid, go straight to the app redirect (which sends to dashboard)
  if (isAuthed) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div style={{ padding: "28px 18px" }}>
      <h1>Megna Real Estate</h1>

      <p>
        <Link to="/login" state={{ backgroundLocation: location, modal: true }}>
          Login
        </Link>
      </p>

      <p>
        Dev tools: {" "}
        <Link to="/_dev/api">
          API Smoke Test
        </Link>
      </p>
    </div>    
  )
}

export default function App() {
  const location = useLocation();
  const backgroundLocation =
    location.state?.modal ? location.state.backgroundLocation : null;
  
  return (
    <>
      <Routes location={backgroundLocation || location}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginModal />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppRedirect />} />
          <Route path="/_dev/api" element={<ApiSmokeTest />} />
        </Route>

        <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="properties" replace />} />
            <Route path="properties" element={<AdminPropertiesPage />} />
            <Route path="investors" element={<AdminInvestorsPage />} />
            <Route path="inquiries" element={<AdminInquiriesPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={["INVESTOR"]} />}>
          <Route path="/investor" element={<InvestorLayout />}>
            <Route index element={<InvestorDashboard />} />
            <Route path="pending" element={<InvestorPending />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {backgroundLocation && (
        <Routes>
          <Route path="/login" element={<LoginModal />} />
        </Routes>)}
    </>
  );
}
