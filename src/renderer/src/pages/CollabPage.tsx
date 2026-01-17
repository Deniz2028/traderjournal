import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthPage } from './AuthPage';
import { AnalysisFeed } from '../components/collab/AnalysisFeed';
import { ChatPanel } from '../components/collab/ChatPanel';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, getDocs, getDocsFromServer } from 'firebase/firestore';
import { SignalListener } from '../components/SignalListener';
import { updateProfile } from 'firebase/auth';

interface Analysis {
    id: string;
    pair: string;
    timeframe: string;
    bias: 'Long' | 'Short' | 'Neutral';
    notes: string;
    created_at: string;
    user_id: string;
    username?: string; // Denormalized
}

export const CollabPage: React.FC = () => {
    const { user, loading, signOut } = useAuth();
    const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
    const [analyses, setAnalyses] = useState<Analysis[]>([]);

    const [connectionState, setConnectionState] = useState<'LIVE' | 'SYNCING' | 'OFFLINE'>('LIVE');

    useEffect(() => {
        if (!user) return;

        // Firestore Realtime Listener for Analyses
        const q = query(
            collection(db, "shared_analyses"),
            orderBy("created_at", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
            const isCached = snapshot.metadata.fromCache;
            const hasPending = snapshot.metadata.hasPendingWrites;

            if (hasPending) {
                setConnectionState('SYNCING');
            } else if (isCached) {
                setConnectionState('OFFLINE');
            } else {
                setConnectionState('LIVE');
            }

            const list: Analysis[] = [];
            snapshot.forEach(doc => {
                list.push({ id: doc.id, ...doc.data() } as Analysis);
            });
            setAnalyses(list);
        }, (error) => {
            console.error("ANALYSIS LIST ERROR:", error);
            alert("War Room Connection Error: " + error.message);
        });

        return () => unsubscribe();
    }, [user]);

    const handleDeleteSuccess = () => {
        if (selectedAnalysisId) {
            setAnalyses(prev => prev.filter(a => a.id !== selectedAnalysisId));
            setSelectedAnalysisId(null);
        }
    };

    const [showProfileModal, setShowProfileModal] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [signals, setSignals] = useState<any[]>([]);

    useEffect(() => {
        // Signals listener
        const q = query(
            collection(db, "trading_signals"),
            orderBy("created_at", "desc"),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach(doc => {
                list.push({ id: doc.id, ...doc.data() });
            });
            setSignals(list);
        });

        return () => unsubscribe();
    }, []);

    const handleUpdateUsername = async () => {
        if (!user || !newUsername.trim()) return;

        setIsSaving(true);
        try {
            // Critical: Update Auth Profile (Primary source of truth for UI)
            await updateProfile(user, { displayName: newUsername.trim() });

            // Non-blocking: Save to Firestore profiles (Future proofing)
            // We don't await this so the user doesn't wait for DB latency
            setDoc(doc(db, "profiles", user.uid), {
                username: newUsername.trim(),
                email: user.email
            }, { merge: true }).catch(err => console.error("Background profile sync error:", err));

            alert('Username updated! Refresh to see changes.');
            setShowProfileModal(false);
        } catch (error: any) {
            alert('Error updating username: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div>Loading War Room...</div>;
    if (!user) {
        return <AuthPage />;
    }

    return (
        <div style={styles.container}>
            {/* Left Sidebar: Feed */}
            <div style={styles.feedColumn}>
                <div style={styles.header}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h2 style={styles.title}>War Room</h2>
                            {connectionState === 'OFFLINE' && (
                                <span style={{ fontSize: 10, backgroundColor: '#FEE2E2', color: '#DC2626', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                                    OFFLINE
                                </span>
                            )}
                            {connectionState === 'SYNCING' && (
                                <span style={{ fontSize: 10, backgroundColor: '#FEF3C7', color: '#D97706', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                                    SYNCING...
                                </span>
                            )}
                            {connectionState === 'LIVE' && (
                                <span style={{ fontSize: 10, backgroundColor: '#D1FAE5', color: '#059669', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                                    LIVE
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                setNewUsername(user.displayName || '');
                                setShowProfileModal(true);
                            }}
                            style={{
                                border: 'none', background: 'none', cursor: 'pointer', fontSize: 18
                            }}
                            title="Edit Profile"
                        >
                            ⚙️
                        </button>
                        <button
                            onClick={async () => {
                                let log = "DIAGNOSTIC REPORT:\n";
                                try {
                                    // 1. Browser Online Status
                                    log += `1. navigator.onLine: ${navigator.onLine}\n`;

                                    // 2. Generic Internet Check
                                    const start = Date.now();
                                    try {
                                        const r = await fetch('https://jsonplaceholder.typicode.com/todos/1');
                                        if (r.ok) {
                                            log += `2. Generic Internet: SUCCESS (${Date.now() - start}ms)\n`;
                                        } else {
                                            log += `2. Generic Internet: HTTP ERROR ${r.status}\n`;
                                        }
                                    } catch (err: any) {
                                        log += `2. Generic Internet: FAILED (${err.message})\n`;
                                    }

                                    // 2.5 Firebase REST Check (Domain Reachability)
                                    try {
                                        const restUrl = `https://firestore.googleapis.com/v1/projects/tradejournal-3eb42/databases/(default)/documents/shared_analyses?pageSize=1&key=${import.meta.env.VITE_FIREBASE_API_KEY}`;
                                        alert("Checking REST Reachability...");
                                        const r = await fetch(restUrl);
                                        log += `2.5 REST Check: Status ${r.status} (${r.statusText})\n`;
                                    } catch (err: any) {
                                        log += `2.5 REST Check: FAILED (${err.message})\n`;
                                    }

                                    // 3. Firebase SDK Check
                                    alert("Testing Firebase Connection... (Please wait)");
                                    const dbStart = Date.now();
                                    const testQ = query(collection(db, "shared_analyses"), limit(1));
                                    const snap = await getDocsFromServer(testQ);
                                    log += `3. Firebase: SUCCESS (${Date.now() - dbStart}ms). Found ${snap.size} docs.`;

                                    alert(log);
                                } catch (e: any) {
                                    console.error(e);
                                    log += `3. Firebase: FAILED\nCode: ${e.code}\nMsg: ${e.message}`;
                                    alert(log);
                                }
                            }}
                            style={{
                                border: '1px solid var(--border-subtle)', background: 'var(--bg-card)',
                                cursor: 'pointer', fontSize: 10, padding: '2px 6px', borderRadius: 4, marginLeft: 8
                            }}
                            title="Run Diagnostics"
                        >
                            🛑 Diag
                        </button>
                    </div>
                    {user.displayName && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Logged in as: {user.displayName}</div>}
                </div>

                {/* Signals Section */}
                {signals.length > 0 && (
                    <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: 12, color: '#EF4444', textTransform: 'uppercase' }}>Recent Alerts & Signals</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {signals.map(signal => (
                                <div key={signal.id} style={{ fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                    <span style={{ fontWeight: 700, minWidth: 50 }}>{signal.pair}</span>
                                    <span>{signal.message}</span>
                                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                                        {new Date(signal.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <SignalListener />

                {/* Profile Modal */}
                {showProfileModal && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modalContent}>
                            <h3>Change Username</h3>
                            <input
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                placeholder="New username..."
                                style={styles.input}
                            />
                            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                                <button onClick={() => setShowProfileModal(false)} style={styles.cancelBtn} disabled={isSaving}>Cancel</button>
                                <button onClick={handleUpdateUsername} style={styles.saveBtn} disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                            <div style={{ marginTop: 16, borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
                                <button
                                    onClick={() => {
                                        if (confirm("Sign out of War Room?")) {
                                            signOut();
                                            setShowProfileModal(false);
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        borderRadius: 6,
                                        border: '1px solid #EF4444',
                                        backgroundColor: 'transparent',
                                        color: '#EF4444',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        fontSize: 13
                                    }}
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <AnalysisFeed
                    analyses={analyses}
                    selectedId={selectedAnalysisId}
                    onSelect={setSelectedAnalysisId}
                />
            </div>

            {/* Right Panel: Chat & Details */}
            <div style={styles.chatColumn}>
                {selectedAnalysisId ? (
                    <ChatPanel
                        analysisId={selectedAnalysisId}
                        onDelete={handleDeleteSuccess}
                    />
                ) : (
                    <div style={styles.emptyState}>
                        <p>Select an analysis to view discussion</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
    },
    feedColumn: {
        width: 350,
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-sidebar)',
    },
    chatColumn: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-main)',
    },
    header: {
        padding: '16px',
        borderBottom: '1px solid var(--border-subtle)',
    },
    title: {
        fontSize: 18,
        fontWeight: 700,
    },
    emptyState: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-secondary)',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: 'var(--bg-card)',
        padding: 24,
        borderRadius: 12,
        width: 300,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid var(--border-subtle)',
    },
    input: {
        width: '100%',
        padding: '8px 12px',
        borderRadius: 6,
        border: '1px solid var(--border-subtle)',
        marginTop: 8,
        backgroundColor: 'var(--bg-input)',
        color: 'var(--text-primary)',
        outline: 'none',
    },
    saveBtn: {
        backgroundColor: 'var(--accent-primary)',
        color: 'white',
        border: 'none',
        padding: '6px 12px',
        borderRadius: 6,
        cursor: 'pointer',
    },
    cancelBtn: {
        backgroundColor: 'transparent',
        color: 'var(--text-secondary)',
        border: 'none',
        padding: '6px 12px',
        borderRadius: 6,
        cursor: 'pointer',
    },
};
