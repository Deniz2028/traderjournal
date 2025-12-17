import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export const AuthPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                alert('Check your email for the confirmation link!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const [debugToken, setDebugToken] = useState<string | null>(null);

    React.useEffect(() => {
        // Check file storage for debug
        window.api.auth.getItem('supabase.auth.token').then(token => {
            setDebugToken(token ? 'YES (Present)' : 'NO (Missing)');
        });
    }, [loading]);

    return (
        <div style={styles.container}>
            <div className="card" style={styles.card}>
                {/* ... existing card content ... */}
                <h2 style={styles.title}>{mode === 'signin' ? 'War Room Login' : 'Join War Room'}</h2>
                <p style={styles.subtitle}>Collaborate with your trading partners.</p>

                {error && <div style={styles.error}>{error}</div>}

                <form onSubmit={handleAuth} style={styles.form}>
                    <div style={styles.field}>
                        <label style={styles.label}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={styles.input}
                            required
                        />
                    </div>
                    <div style={styles.field}>
                        <label style={styles.label}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.input}
                            required
                        />
                    </div>

                    {mode === 'signin' && (
                        <div style={styles.rememberRow}>
                            <input
                                type="checkbox"
                                id="rememberMe"
                                defaultChecked={true}
                                style={{ cursor: 'pointer' }}
                            />
                            <label htmlFor="rememberMe" style={{ ...styles.label, cursor: 'pointer', marginBottom: 0 }}>
                                Remember me (Keep me logged in)
                            </label>
                        </div>
                    )}

                    <button type="submit" style={styles.button} disabled={loading}>
                        {loading ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
                    </button>
                </form>

                <button
                    onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                    style={styles.linkButton}
                >
                    {mode === 'signin' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
                </button>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        width: 400,
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 700,
        marginBottom: 8,
    },
    subtitle: {
        color: 'var(--text-secondary)',
        marginBottom: 24,
        textAlign: 'center',
    },
    form: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
    },
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    label: {
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-secondary)',
    },
    input: {
        padding: '10px',
        borderRadius: 8,
        border: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text-primary)',
        outline: 'none',
    },
    button: {
        marginTop: 8,
        backgroundColor: 'var(--accent-primary)',
        color: 'white',
        padding: '12px',
        borderRadius: 8,
        fontWeight: 600,
        cursor: 'pointer',
    },
    error: {
        backgroundColor: '#FEF2F2',
        color: '#DC2626',
        padding: '10px',
        borderRadius: 8,
        marginBottom: 16,
        width: '100%',
        fontSize: 13,
    },
    linkButton: {
        marginTop: 16,
        background: 'none',
        border: 'none',
        color: 'var(--accent-primary)',
        cursor: 'pointer',
        fontSize: 13,
    },
};
