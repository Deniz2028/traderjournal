import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    signOut: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    signOut: async () => { },
    loading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log("AuthContext: Initializing...");
        // 1. Get initial session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            console.log("AuthContext: getSession result:", session ? "Session found" : "No session", error);
            if (session) {
                console.log("User:", session.user.email);
            }
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        }).catch(err => {
            console.error("AuthContext: getSession failed:", err);
            setLoading(false);
        });


        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("AuthContext: Event:", event, "Session User:", session?.user?.email ?? "None");
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ session, user, signOut, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
