import { Navigate } from "react-router-dom";
import { useAuth } from "@/features/auth";

export default function AppRedirect() {
    const { user } = useAuth();

    if (!user) return <Navigate to="/" replace />;

    if (user.role === "ADMIN") return <Navigate to="/admin" replace />;

    if (user.role === "INVESTOR") {
        if (user.status === "APPROVED") return <Navigate to="/investor" replace />;
        return <Navigate to="/investor/pending" replace />;
    }

    if (user.role === "SELLER") return <Navigate to="/seller" replace />;

    return <Navigate to="/" replace />;
}
