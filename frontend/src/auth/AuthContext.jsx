import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearAccessToken, getAccessToken, login, logout, me, setAccessToken } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [bootstrapping, setBootstrapping] = useState(true);

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
        }

        window.addEventListener("mv:auth:expired", onExpired);
        return () => window.removeEventListener("mv:auth:expired", onExpired);
    }, []);

    async function signIn(email, password) {
        const loginRes = await login({ email, password });
        const token = loginRes?.accessToken;

        if (!token) {
            const err = new Error("Login failed (no access token returned).");
            err.code = "NO_TOKEN";
            throw err;
        }

        const profile = await me(token);

        if (profile?.role === "INVESTOR" && profile?.status !== "APPROVED") {
            clearAccessToken();
            setUser(null);

            const code = profile?.status === "PENDING" ? "PENDING" : "REJECTED";
            const message = 
                code === "PENDING"
                ? "Your account is in review. Please wait for the Megna team to approve you."
                : "Your account is not approved. Please contact the Megna team.";
            
            throw { code, message, profile };
        }

        setAccessToken(token);
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