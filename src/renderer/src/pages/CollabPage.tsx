import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthPage } from './AuthPage';
import { AnalysisFeed } from '../components/collab/AnalysisFeed';
import { ChatPanel } from '../components/collab/ChatPanel';
import { supabase } from '../lib/supabase';

interface Analysis {
    id: string;
    pair: string;
    timeframe: string;
    bias: 'Long' | 'Short' | 'Neutral';
    notes: string;
    created_at: string;
    user_id: string;
}

export const CollabPage: React.FC = () => {
    const { user, loading, signOut } = useAuth();
    const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
    const [analyses, setAnalyses] = useState<Analysis[]>([]);

    useEffect(() => {
        fetchAnalyses();

        // Polling fallback: Fetch every 10 seconds to ensure fresh data
        const interval = setInterval(() => {
            fetchAnalyses();
        }, 10000);

        // Realtime subscription
        const channel = supabase
            .channel('collab_page_feed')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'shared_analyses' },
                (payload) => {
                    // console.log("New analysis received:", payload);
                    setAnalyses((current) => {
                        // Avoid duplicates if polling/fetch already got it
                        if (current.some(a => a.id === payload.new.id)) return current;
                        return [payload.new as Analysis, ...current];
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'shared_analyses' },
                (payload) => {
                    setAnalyses((current) => current.filter(item => item.id !== payload.old.id));
                }
            )
            .subscribe();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchAnalyses = async () => {
        // Calculate start of today in UTC to filter
        // We want "Since Morning" kind of logic.
        // Simple approach: Get local YYYY-MM-DD, treat as start.
        const todayStr = new Date().toISOString().split('T')[0]; // simple UTC date or local? 
        // Better: new Date().setHours(0,0,0,0) then toISOString()
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from('shared_analyses')
            .select('*')
            .gte('created_at', startOfDay.toISOString())
            .order('created_at', { ascending: false });

        if (!error && data) {
            setAnalyses(data);
        }
    };

    const handleDeleteSuccess = () => {
        if (selectedAnalysisId) {
            // Optimistic update: remove the deleted item from the list instantly
            setAnalyses(prev => prev.filter(a => a.id !== selectedAnalysisId));
            setSelectedAnalysisId(null);
        }
    };

    const [showProfileModal, setShowProfileModal] = useState(false);
    const [newUsername, setNewUsername] = useState('');

    useEffect(() => {
        // ... existing useEffect
    }, []);

    // ... existing functions ...

    const handleUpdateUsername = async () => {
        if (!user || !newUsername.trim()) return;

        const { error } = await supabase
            .from('profiles')
            .update({ username: newUsername.trim() })
            .eq('id', user.id);

        if (error) {
            alert('Error updating username: ' + error.message);
        } else {
            alert('Username updated! Refresh to see changes.');
            setShowProfileModal(false);
        }
    };

    // console.log("CollabPage Render - Loading:", loading, "User:", user?.email);

    if (loading) return <div>Loading War Room...</div>;
    if (!user) {
        // console.log("CollabPage: No user, rendering AuthPage");
        return <AuthPage />;
    }

    return (
        <div style={styles.container}>
            {/* Left Sidebar: Feed */}
            <div style={styles.feedColumn}>
                <div style={styles.header}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={styles.title}>War Room</h2>
                        <button
                            onClick={() => {
                                setNewUsername(''); // Reset or fetch current?
                                setShowProfileModal(true);
                            }}
                            style={{
                                border: 'none', background: 'none', cursor: 'pointer', fontSize: 18
                            }}
                            title="Edit Profile"
                        >
                            ⚙️
                        </button>
                    </div>
                </div>

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
                                <button onClick={() => setShowProfileModal(false)} style={styles.cancelBtn}>Cancel</button>
                                <button onClick={handleUpdateUsername} style={styles.saveBtn}>Save</button>
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
