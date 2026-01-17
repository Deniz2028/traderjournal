import React from 'react';

import { format } from 'date-fns';

interface Analysis {
    id: string;
    pair: string;
    timeframe: string;
    bias: 'Long' | 'Short' | 'Neutral';
    notes: string;
    created_at: string;
    user_id: string;
}

interface AnalysisFeedProps {
    analyses: Analysis[]; // New prop
    selectedId: string | null;
    onSelect: (id: string) => void;
}

export const AnalysisFeed: React.FC<AnalysisFeedProps> = ({ analyses, selectedId, onSelect }) => {
    // State and Effect removed (lifted up)

    const getBiasColor = (bias: string) => {
        if (bias === 'Long') return 'var(--color-green)';
        if (bias === 'Short') return 'var(--color-red)';
        return '#F59E0B'; // Orange/Neutral
    };

    const getBiasBg = (bias: string) => {
        if (bias === 'Long') return '#ECFDF5';
        if (bias === 'Short') return '#FEF2F2';
        return '#FFFBEB';
    };

    return (
        <div style={styles.list}>
            {analyses.map(item => {
                const isSelected = item.id === selectedId;
                return (
                    <div
                        key={item.id}
                        onClick={() => onSelect(item.id)}
                        style={{
                            ...styles.card,
                            backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                            borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'
                        }}
                    >
                        <div style={styles.cardHeader}>
                            <span style={styles.pair}>{item.pair}</span>
                            <span style={{
                                ...styles.biasTag,
                                color: getBiasColor(item.bias),
                                backgroundColor: getBiasBg(item.bias)
                            }}>
                                {item.bias}
                            </span>
                        </div>

                        <div style={styles.metaRow}>
                            <span style={styles.meta}>{item.timeframe}</span>
                            <span style={styles.meta}>•</span>
                            <span style={styles.meta}>
                                {format(new Date(item.created_at), 'HH:mm')}
                            </span>
                        </div>

                        <p style={styles.preview}>
                            {item.notes}
                        </p>
                    </div>
                );
            })}
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    list: {
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        overflowY: 'auto',
        flex: 1,
    },
    card: {
        padding: '12px',
        borderRadius: 8,
        border: '1px solid var(--border-subtle)',
        cursor: 'pointer',
        transition: 'all 0.1s ease',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    pair: {
        fontWeight: 700,
        fontSize: 14,
    },
    biasTag: {
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 6px',
        borderRadius: 4,
    },
    metaRow: {
        display: 'flex',
        gap: 6,
        fontSize: 11,
        color: 'var(--text-secondary)',
        marginBottom: 8,
    },
    meta: {},
    preview: {
        fontSize: 13,
        color: 'var(--text-secondary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        margin: 0,
    },
};
