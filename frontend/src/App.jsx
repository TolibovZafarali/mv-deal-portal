import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { ProtectedRoute, useAuth } from "./auth"
import AdminLayout from "./layouts/AdminLayout"
import InvestorLayout from "./layouts/InvestorLayout"
import LoginModal from "./modals/LoginModal"
import SignUpModal from "./modals/SignUpModal"
import ApiSmokeTest from "./pages/ApiSmokeTest"
import AppRedirect from "./pages/AppRedirect"
import HomePage from "./pages/HomePage"
import AdminInquiriesPage from "./pages/admin/AdminInquiriesPage"
import AdminInvestorsPage from "./pages/admin/AdminInvestorPage"
import AdminPropertiesPage from "./pages/admin/AdminPropertiesPage"
import InvestorDashboard from "./pages/investor/InvestorDashboard"
import InvestorPending from "./pages/investor/InvestorPending"

function Home() {
  const location = useLocation()
  const { isAuthed, bootstrapping } = useAuth()

  return (
    <HomePage
      location={location}
      isAuthed={isAuthed}
      bootstrapping={bootstrapping}
    />
  )
}

export default function App() {
  const location = useLocation()
  const backgroundLocation = location.state?.modal
    ? location.state.backgroundLocation
    : null

  return (
    <>
      <Routes location={backgroundLocation || location}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginModal />} />
        <Route path="/signup" element={<SignUpModal />} />

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
          <Route path="/signup" element={<SignUpModal />} />
        </Routes>
      )}
    </>
  )
}
