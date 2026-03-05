import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth";
import InvestorDashboard from "@/features/investor/pages/InvestorDashboard";

export default function InvestorHome() {
  const { user } = useAuth();
  const status = String(user?.status ?? "").trim().toUpperCase();

  if (status.startsWith("PENDING")) {
    return <Navigate to="/investor/pending" replace />;
  }

  return <InvestorDashboard />;
}
