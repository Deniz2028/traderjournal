import React, { createContext, useContext, useEffect, useState } from 'react';

// Mock User interface to match Firebase User roughly
interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
}

interface AuthContextType {
    user: User | null;
    signOut: () => Promise<void>;
    loading: boolean;
}

const OFFLINE_USER: User = {
    uid: "offline-local-user",
    email: "trader@local",
    displayName: "Trader"
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    signOut: async () => { },
    loading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Instant "login" for offline mode
        console.log("AuthContext: Offline mode active. Logging in automatically.");
        setUser(OFFLINE_USER);
        setLoading(false);
    }, []);

    const signOut = async () => {
        // No-op in offline mode, or maybe just log log content
        console.log("Sign out requested (Offline mode ignores this)");
        // Ideally we don't even show sign out button
    };

    return (
        <AuthContext.Provider value={{ user, signOut, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
