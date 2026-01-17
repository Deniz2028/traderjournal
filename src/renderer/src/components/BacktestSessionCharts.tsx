import React, { useMemo } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';
import { format, parseISO, getDay } from 'date-fns';

interface Trade {
    date: string;
    outcome: "TP" | "SL" | "BE";
    resultR?: number; // assuming we might store R, or we use fixed R based on outcome
}

interface BacktestSessionChartsProps {
    trades: any[]; // relaxed type for now
    startBalance: number;
}

export const BacktestSessionCharts: React.FC<BacktestSessionChartsProps> = ({ trades, startBalance }) => {

    // Process Data for Equity Curve
    const equityData = useMemo(() => {
        let currentBalance = startBalance;
        const safeTrades = Array.isArray(trades) ? trades : [];
        // Sort trades by date
        const sorted = [...safeTrades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const data = sorted.map(t => {
            // Primitive PnL sim: TP = +2%, SL = -1% (User didn't specify, so simulation for visual)
            // ideally we use actual PnL if stored, but let's assume specific risk params or just pure outcome count
            // For better viz, let's assume:
            // TP = +2R, SL = -1R. If we don't have R values, we guess.
            let pnl = 0;
            if (t.outcome === 'TP') pnl = startBalance * 0.02;
            if (t.outcome === 'SL') pnl = -startBalance * 0.01;

            currentBalance += pnl;
            return {
                date: t.date,
                balance: currentBalance,
                pnl
            };
        });

        // Add start point
        return [{ date: 'Start', balance: startBalance }, ...data];
    }, [trades, startBalance]);

    // Monthly Performance
    const monthlyData = useMemo(() => {
        const months: Record<string, number> = {};
        const safeTrades = Array.isArray(trades) ? trades : [];
        safeTrades.forEach(t => {
            const d = new Date(t.date);
            const key = format(d, 'MMM');

            let val = 0;
            if (t.outcome === 'TP') val = 2; // R
            else if (t.outcome === 'SL') val = -1; // R

            months[key] = (months[key] || 0) + val;
        });
        return Object.keys(months).map(m => ({ month: m, value: months[m] }));
    }, [trades]);

    // Daily Performance (Day of week)
    const dailyData = useMemo(() => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const stats = days.map(d => ({ day: d, val: 0 }));
        const safeTrades = Array.isArray(trades) ? trades : [];

        safeTrades.forEach(t => {
            const d = new Date(t.date);
            const dayIdx = getDay(d);

            let val = 0;
            if (t.outcome === 'TP') val = 2;
            else if (t.outcome === 'SL') val = -1;

            stats[dayIdx].val += val;
        });

        return stats.filter(s => s.day !== 'Saturday' && s.day !== 'Sunday'); // Filter weekends if mostly empty
    }, [trades]);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 16 }}>
            {/* Equity */}
            <div className="card" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: 16 }}>
                <h3 style={{ color: 'var(--text-primary)', fontSize: 14, marginBottom: 12 }}>Equity</h3>
                <div style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={equityData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                            <XAxis dataKey="date" hide />
                            <YAxis domain={['auto', 'auto']} hide />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 4, color: 'var(--text-primary)' }}
                                labelStyle={{ color: 'var(--text-secondary)' }}
                            />
                            <Line type="monotone" dataKey="balance" stroke="var(--accent-primary)" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Monthly */}
            <div className="card" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: 16 }}>
                <h3 style={{ color: 'var(--text-primary)', fontSize: 14, marginBottom: 12 }}>Monthly Performance</h3>
                <div style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                            <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{ fill: 'var(--bg-element)', opacity: 0.4 }} contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
                            <Bar dataKey="value">
                                {monthlyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10B981' : '#EF4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Daily */}
            <div className="card" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: 16 }}>
                <h3 style={{ color: 'var(--text-primary)', fontSize: 14, marginBottom: 12 }}>Daily Performance</h3>
                <div style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                            <XAxis dataKey="day" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
                            <Tooltip cursor={{ fill: 'var(--bg-element)', opacity: 0.4 }} contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
                            <Bar dataKey="val">
                                {dailyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.val >= 0 ? 'var(--accent-primary)' : '#EF4444'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
