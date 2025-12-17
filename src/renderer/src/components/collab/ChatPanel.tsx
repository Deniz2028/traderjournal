import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import type { MorningMtfInstrumentSnapshot } from '../../../../shared/morningMtfTypes';

interface ChatPanelProps {
    analysisId: string;
    onDelete?: () => void;
}

interface Message {
    id: string;
    content: string;
    user_id: string;
    created_at: string;
    profiles?: {
        username: string;
    };
}

interface AnalysisCallback {
    pair: string;
    timeframe: string;
    bias: string;
    notes: string;
    image_url: string;
    created_at: string;
    user_id: string;
    instrument_data?: MorningMtfInstrumentSnapshot; // New field
    profiles?: {
        username: string;
    };
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ analysisId, onDelete }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [analysis, setAnalysis] = useState<AnalysisCallback | null>(null);
    const [inputText, setInputText] = useState('');
    const [imageModal, setImageModal] = useState<string | null>(null);
    const [loading, setLoading] = useState(true); // Added loading state

    // State for multi-tf view
    const [activeTab, setActiveTab] = useState<string>('');
    const bottomRef = useRef<HTMLDivElement>(null);

    const fetchMessages = async () => {
        const { data: msgsData, error } = await supabase
            .from('chat_messages')
            .select('*, profiles(username)')
            .eq('analysis_id', analysisId)
            .order('created_at', { ascending: true });

        if (!error && msgsData) {
            setMessages(msgsData as any);
            setTimeout(scrollToBottom, 100);
        }
    };

    const fetchAnalysisDetails = async () => {
        const { data: analysisData } = await supabase
            .from('shared_analyses')
            .select('*, profiles(username)')
            .eq('id', analysisId)
            .single();

        if (analysisData) setAnalysis(analysisData as any);
    };

    useEffect(() => {
        if (!analysisId) return;

        setLoading(true);
        setMessages([]); // Clear messages on analysisId change
        setAnalysis(null); // Clear analysis on analysisId change
        fetchMessages();
        fetchAnalysisDetails();
        setLoading(false);

        const channel = supabase
            .channel(`chat:${analysisId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `analysis_id=eq.${analysisId}`,
                },
                (payload) => {
                    const newMsg = payload.new as Message;
                    // Prevent duplicate if optimistic update already added it (check by ID if possible, or simple dedupe)
                    setMessages((current) => {
                        if (current.some(m => m.id === newMsg.id)) return current;
                        return [...current, newMsg];
                    });
                    scrollToBottom();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [analysisId]);

    // When analysis loads, set default tab
    useEffect(() => {
        if (analysis?.instrument_data?.timeframes?.length) {
            setActiveTab(analysis.instrument_data.timeframes[0].tf);
        }
    }, [analysis]);

    // Lightbox Keyboard Navigation
    useEffect(() => {
        if (!imageModal || !analysis) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setImageModal(null);
                return;
            }

            // Build gallery list
            let images: string[] = [];
            if (analysis.instrument_data?.timeframes) {
                images = analysis.instrument_data.timeframes
                    .map(tf => tf.chartUrl)
                    .filter(url => !!url);
            } else if (analysis.image_url) {
                images = [analysis.image_url];
            }

            if (images.length <= 1) return;

            const currentIndex = images.indexOf(imageModal);
            if (currentIndex === -1) return;

            if (e.key === 'ArrowRight') {
                const nextIndex = currentIndex + 1;
                if (nextIndex < images.length) {
                    setImageModal(images[nextIndex]);
                }
            } else if (e.key === 'ArrowLeft') {
                const prevIndex = currentIndex - 1;
                if (prevIndex >= 0) {
                    setImageModal(images[prevIndex]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [imageModal, analysis]);


    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !user) return;

        const content = inputText.trim();
        setInputText('');

        // Optimistic update
        const tempId = crypto.randomUUID();
        const optimisticMsg: Message = {
            id: tempId,
            content,
            user_id: user.id,
            created_at: new Date().toISOString(),
            profiles: { username: 'You' }
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setTimeout(scrollToBottom, 50);

        const { error } = await supabase.from('chat_messages').insert({
            analysis_id: analysisId,
            user_id: user.id,
            content,
        });

        if (error) {
            alert('Failed to send: ' + error.message);
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this analysis?')) return;

        // Select count to verify deletion
        const { error, count } = await supabase
            .from('shared_analyses')
            .delete({ count: 'exact' })
            .eq('id', analysisId);

        if (error) {
            alert('Error deleting: ' + error.message);
        } else if (count === 0) {
            alert('Could not delete. You might not be the owner or permissions are missing.');
        } else {
            onDelete?.(); // Only clear from UI if DB delete was successful
        }
    };

    const getBiasColor = (bias: string) => {
        if (bias === 'Long') return '#16A34A';
        if (bias === 'Short') return '#DC2626';
        return '#F59E0B';
    };

    // Helper to render the correct view based on data source
    const renderContent = () => {
        if (!analysis) return null;

        // MULTI-TIMEFRAME VIEW
        if (analysis.instrument_data) {
            const inst = analysis.instrument_data;

            // Determine overall bias (e.g. from highest TF or just show first)
            // Or just display pair name plainly

            return (
                <div style={styles.contextCard}>
                    <div style={styles.contextHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={styles.pair}>{inst.symbol}</span>
                            {/* Overall Date/Author */}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={styles.author}>
                                Shared by {analysis.profiles?.username || 'Unknown'} at {format(new Date(analysis.created_at), 'HH:mm')}
                            </div>
                            {user?.id === analysis.user_id && (
                                <button onClick={handleDelete} style={styles.deleteBtn} title="Delete">🗑️</button>
                            )}
                        </div>
                    </div>

                    {/* Grid of Timeframes */}
                    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
                        {inst.timeframes.map((tf, index) => (
                            <div key={index} style={{
                                flex: '0 0 300px', // Fixed width columns or flexible? Let's do reasonably wide cards
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 8,
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 8,
                                padding: 12,
                                backgroundColor: 'var(--bg-card)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700, fontSize: 14 }}>{tf.tf}</span>
                                    <span style={{
                                        ...styles.tag,
                                        color: 'white',
                                        backgroundColor: getBiasColor(tf.bias)
                                    }}>
                                        {tf.bias}
                                    </span>
                                </div>

                                {tf.chartUrl ? (
                                    <div style={{ position: 'relative', cursor: 'zoom-in' }} onClick={() => setImageModal(tf.chartUrl)}>
                                        <img
                                            src={tf.chartUrl}
                                            alt={`${tf.tf} Chart`}
                                            style={{ width: '100%', borderRadius: 6, display: 'block' }}
                                        />
                                    </div>
                                ) : (
                                    <div style={{
                                        height: 150,
                                        backgroundColor: '#F3F4F6',
                                        borderRadius: 6,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#9CA3AF',
                                        fontSize: 12
                                    }}>
                                        No Chart
                                    </div>
                                )}

                                {tf.notes && (
                                    <div style={{
                                        fontSize: 12,
                                        color: 'var(--text-secondary)',
                                        fontStyle: 'italic',
                                        background: 'var(--bg-main)',
                                        padding: 8,
                                        borderRadius: 6
                                    }}>
                                        "{tf.notes}"
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // LEGACY / SINGLE VIEW
        return (
            <div style={styles.contextCard}>
                <div style={styles.contextHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={styles.pair}>{analysis.pair}</span>
                        <span style={styles.tag}>{analysis.timeframe}</span>
                        <span style={{
                            ...styles.tag,
                            color: 'white',
                            fontWeight: 700,
                            backgroundColor: getBiasColor(analysis.bias)
                        }}>
                            {analysis.bias}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={styles.author}>
                            Shared by {analysis.profiles?.username || 'Unknown'} at {format(new Date(analysis.created_at), 'HH:mm')}
                        </div>
                        {user?.id === analysis.user_id && (
                            <button onClick={handleDelete} style={styles.deleteBtn} title="Delete">🗑️</button>
                        )}
                    </div>
                </div>

                {analysis.notes && <div style={styles.notes}>"{analysis.notes}"</div>}

                {analysis.image_url && (
                    <div style={styles.imageContainer}>
                        <img
                            src={analysis.image_url}
                            alt="Chart"
                            style={styles.thumbImage}
                            onClick={() => setImageModal(analysis.image_url)}
                        />
                        <div style={styles.zoomHint}>Click to zoom</div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={styles.container}>
            {renderContent()}

            <div style={styles.messagesArea}>
                {messages.length === 0 && (
                    <div style={styles.empty}>No messages yet. Start the discussion!</div>
                )}
                {messages.map((msg) => {
                    const isMe = msg.user_id === user?.id;
                    return (
                        <div
                            key={msg.id}
                            style={{
                                ...styles.messageRow,
                                justifyContent: isMe ? 'flex-end' : 'flex-start'
                            }}
                        >
                            <div style={{
                                ...styles.bubble,
                                backgroundColor: isMe ? 'var(--accent-primary)' : '#F3F4F6',
                                color: isMe ? 'white' : 'black',
                            }}>
                                {!isMe && <div style={styles.sender}>{msg.profiles?.username || 'User'}</div>}
                                <div style={styles.content}>{msg.content}</div>
                                <div style={{
                                    ...styles.time,
                                    color: isMe ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.4)'
                                }}>
                                    {format(new Date(msg.created_at), 'HH:mm')}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSend} style={styles.inputArea}>
                <input
                    style={styles.input}
                    placeholder="Type a message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                />
                <button type="submit" style={styles.sendBtn}>Send</button>
            </form>

            {/* Lightbox */}
            {imageModal && (
                <div
                    style={styles.modalOverlay}
                    onClick={() => setImageModal(null)}
                >
                    <img src={imageModal} style={styles.modalImg} />
                </div>
            )}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
    },
    contextCard: {
        padding: 16,
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-secondary)',
    },
    contextHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    pair: {
        fontSize: 16,
        fontWeight: 700,
    },
    tag: {
        fontSize: 11,
        padding: '2px 6px',
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
        fontWeight: 600,
    },
    author: {
        fontSize: 11,
        color: 'var(--text-secondary)',
    },
    notes: {
        fontSize: 13,
        fontStyle: 'italic',
        color: 'var(--text-primary)',
        marginBottom: 12,
        padding: '8px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: 6,
        border: '1px solid var(--border-subtle)',
    },
    imageContainer: {
        position: 'relative',
        width: 'fit-content',
        cursor: 'zoom-in',
    },
    thumbImage: {
        maxHeight: 150,
        borderRadius: 8,
        border: '1px solid var(--border-subtle)',
        display: 'block',
    },
    zoomHint: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        color: 'white',
        fontSize: 10,
        padding: '2px 6px',
        borderRadius: 4,
        pointerEvents: 'none',
    },
    messagesArea: {
        flex: 1,
        padding: 20,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
    },
    empty: {
        textAlign: 'center',
        color: 'var(--text-secondary)',
        marginTop: 40,
    },
    messageRow: {
        display: 'flex',
    },
    bubble: {
        maxWidth: '70%',
        padding: '8px 12px',
        borderRadius: 12,
        position: 'relative',
    },
    sender: {
        fontSize: 10,
        fontWeight: 700,
        marginBottom: 2,
        opacity: 0.6,
    },
    content: {
        fontSize: 14,
        lineHeight: 1.4,
    },
    time: {
        fontSize: 10,
        marginTop: 4,
        textAlign: 'right',
    },
    inputArea: {
        padding: 16,
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        gap: 8,
        backgroundColor: 'var(--bg-card)',
    },
    input: {
        flex: 1,
        padding: '10px 14px',
        borderRadius: 20,
        border: '1px solid var(--border-subtle)',
        outline: 'none',
    },
    sendBtn: {
        backgroundColor: 'var(--accent-primary)',
        color: 'white',
        border: 'none',
        borderRadius: 20,
        padding: '0 20px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    deleteBtn: {
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        fontSize: 14,
        padding: 4,
        opacity: 0.6,
        transition: 'opacity 0.2s',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.9)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'zoom-out',
        animation: 'fadeIn 0.25s ease'
    },
    modalImg: {
        maxWidth: '95vw',
        maxHeight: '95vh',
        objectFit: 'contain',
        borderRadius: 4,
    }
};
