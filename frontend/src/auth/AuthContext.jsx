import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAccessToken, login, logout, me } from "../api";

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

    async function signIn(email, password) {
        await login({ email, password });
        const profile = await me();
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

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProfile />");
    return ctx;
}