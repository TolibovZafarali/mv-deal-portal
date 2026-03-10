import { Suspense, lazy } from "react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { ProtectedRoute, useAuth } from "@/features/auth"

const AdminLayout = lazy(() => import("@/features/admin/layout/AdminLayout"))
const InvestorLayout = lazy(() => import("@/features/investor/layout/InvestorLayout"))
const SellerLayout = lazy(() => import("@/features/seller/layout/SellerLayout"))
const LoginModal = lazy(() => import("@/features/auth/modals/LoginModal"))
const ForgotPasswordModal = lazy(() => import("@/features/auth/modals/ForgotPasswordModal"))
const ResetPasswordModal = lazy(() => import("@/features/auth/modals/ResetPasswordModal"))
const SignUpModal = lazy(() => import("@/features/auth/modals/SignUpModal"))
const ContactModal = lazy(() => import("@/features/home/modals/ContactModal"))
const ApiSmokeTest = lazy(() => import("@/features/dev/pages/ApiSmokeTest"))
const AppRedirect = lazy(() => import("@/app/routing/AppRedirect"))
const HomePage = lazy(() => import("@/features/home/pages/HomePage"))
const PrivacyPolicyPage = lazy(() => import("@/features/home/pages/PrivacyPolicyPage"))
const TermsOfUsePage = lazy(() => import("@/features/home/pages/TermsOfUsePage"))
const AdminInquiriesPage = lazy(() => import("@/features/admin/pages/AdminInquiriesPage"))
const AdminContactRequestsPage = lazy(() => import("@/features/admin/pages/AdminContactRequestsPage"))
const AdminInvestorsPage = lazy(() => import("@/features/admin/pages/AdminInvestorsPage"))
const AdminSellersPage = lazy(() => import("@/features/admin/pages/AdminSellersPage"))
const AdminPropertiesPage = lazy(() => import("@/features/admin/pages/AdminPropertiesPage"))
const InvestorHome = lazy(() => import("@/features/investor/pages/InvestorHome"))
const InvestorPending = lazy(() => import("@/features/investor/pages/InvestorPending"))
const SellerListingsPage = lazy(() => import("@/features/seller/pages/SellerListingsPage"))
const SellerListingEditorPage = lazy(() => import("@/features/seller/pages/SellerListingEditorPage"))
const SellerInboxPage = lazy(() => import("@/features/seller/pages/SellerInboxPage"))
const SellerProfilePage = lazy(() => import("@/features/seller/pages/SellerProfilePage"))

function Home() {
  const location = useLocation()
  const { user, isAuthed, bootstrapping, refresh, sessionRestoreError, signOut } = useAuth()

  return (
    <HomePage
      location={location}
      user={user}
      isAuthed={isAuthed}
      bootstrapping={bootstrapping}
      retrySessionRestore={refresh}
      sessionRestoreError={sessionRestoreError}
      signOut={signOut}
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
      <Suspense fallback={<div className="appRouteFallback">Loading page...</div>}>
        <Routes location={backgroundLocation || location}>
          <Route path="/" element={<Home />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfUsePage />} />
          <Route path="/login" element={<LoginModal />} />
          <Route path="/forgot-password" element={<ForgotPasswordModal />} />
          <Route path="/reset-password" element={<ResetPasswordModal />} />
          <Route path="/signup" element={<SignUpModal />} />
          <Route path="/signup/seller" element={<SignUpModal />} />
          <Route path="/contact" element={<ContactModal />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<AppRedirect />} />
            <Route path="/_dev/api" element={<ApiSmokeTest />} />
          </Route>

          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="properties" replace />} />
              <Route path="queue" element={<Navigate to="/admin/properties" replace />} />
              <Route path="properties" element={<AdminPropertiesPage />} />
              <Route path="investors" element={<AdminInvestorsPage />} />
              <Route path="sellers" element={<AdminSellersPage />} />
              <Route path="inquiries" element={<AdminInquiriesPage />} />
              <Route path="contact-requests" element={<AdminContactRequestsPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={["INVESTOR"]} />}>
            <Route path="/investor" element={<InvestorLayout />}>
              <Route index element={<InvestorHome />} />
              <Route path="pending" element={<InvestorPending />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute roles={["SELLER"]} />}>
            <Route path="/seller" element={<SellerLayout />}>
              <Route index element={<Navigate to="listings" replace />} />
              <Route path="command" element={<Navigate to="/seller/listings" replace />} />
              <Route path="listings" element={<SellerListingsPage />} />
              <Route path="listings/new" element={<SellerListingEditorPage />} />
              <Route path="listings/:id/edit" element={<SellerListingEditorPage />} />
              <Route path="inbox" element={<SellerInboxPage />} />
              <Route path="profile" element={<SellerProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {backgroundLocation && (
        <Suspense fallback={null}>
          <Routes>
            <Route path="/login" element={<LoginModal />} />
            <Route path="/forgot-password" element={<ForgotPasswordModal />} />
            <Route path="/reset-password" element={<ResetPasswordModal />} />
            <Route path="/signup" element={<SignUpModal />} />
            <Route path="/signup/seller" element={<SignUpModal />} />
            <Route path="/contact" element={<ContactModal />} />
          </Routes>
        </Suspense>
      )}
    </>
  )
}
