import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAccessToken, login, logout, me } from "../api";
import { useLocation, useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [bootstrapping, setBootstrapping] = useState(true);

    const navigate = useNavigate();
    const location = useLocation();

    const openLoginOnHome = useCallback(() => {
        if (location.pathname === "/login") return;

        const homeBg = {
            pathname: "/",
            search: "",
            hash: "",
            state: null,
            key: "home-bg",
        };

        navigate("/login", {
            replace: true,
            state: {
                modal: true,
                backgroundLocation: homeBg,
                from: "/app",               // after login -> dashboard redirect
                forceHomeOnClose: true,     // so X/outside click returns home
            },
        });
    }, [navigate, location.pathname]);

    async function bootstrap() {
        const token = getAccessToken();

        if (!token) {
            setUser(null);
            setBootstrapping(false);
            return;
        }

        try {
            const profile = await me();
            setUser(profile);
        } catch {
            // token is probably invalid/expired
            logout();
            setUser(null);
            openLoginOnHome();
        } finally {
            setBootstrapping(false);
        }
    }

    useEffect(() => {
        bootstrap();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        function onExpired() {
            setUser(null);
            openLoginOnHome();
        }

        window.addEventListener("mv:auth:expired", onExpired);
        return () => window.removeEventListener("mv:auth:expired", onExpired);
    }, [openLoginOnHome]);

    async function signIn(email, password) {
        await login({ email, password });

        const profile = await me();

        // Block pending investors (no dashboard access, no token persistence)
        if (profile?.role === "INVESTOR" && profile?.status === "PENDING") {
            logout(); // clears localStorage token
            setUser(null);

            const err = new Error("Your account is in review. Please wait for our team to reach out.");
            err.code = "ACCOUNT_PENDING";
            throw err;
        }

        setUser(profile);
        return profile;
    }

    function signOut() {
        logout();
        setUser(null);
    }

    const value = useMemo(
        () => ({
            user,
            bootstrapping,
            bootstrap,
            isAuthed: !!user,
            signIn,
            signOut,
            refresh: bootstrap,
        }),
        [user, bootstrapping]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProfile />");
    return ctx;
}