import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth";

export default function InvestorPending() {
  const { user } = useAuth();
  const status = String(user?.status ?? "").trim().toUpperCase();

  if (status === "APPROVED") {
    return <Navigate to="/investor" replace />;
  }

  return (
    <div>
      <h2>Investor • Pending Approval</h2>
      <p>Your account is not approved yet. An admin has to approve you.</p>
    </div>
  );
}
