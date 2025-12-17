import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'alert' | 'info' | 'trade_setup';
    created_at: string;
    payload?: any;
}

export const TvAlertListener: React.FC = () => {
    const [_alerts, setAlerts] = useState<Notification[]>([]);

    useEffect(() => {
        // Subscribe to new notifications (global broadcast)
        const channel = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications' },
                (payload) => {
                    const newAlert = payload.new as Notification;
                    triggerToast(newAlert);
                    // Optional: Keep a history of recent alerts
                    setAlerts(prev => [newAlert, ...prev].slice(0, 5));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const triggerToast = (alert: Notification) => {
        // Simple custom toast implementation
        const toastId = `toast-${alert.id}`;

        // Check if system notifications are supported/granted
        if (Notification.permission === 'granted') {
            new Notification(`🚨 ${alert.title}`, {
                body: alert.message,
                icon: '/favicon.ico' // Ensure this exists or remove
            });
        }

        // In-app visual cue
        const container = document.getElementById('toast-container');
        if (container) {
            const el = document.createElement('div');
            el.id = toastId;
            el.className = 'tv-toast-slide-in';
            el.style.backgroundColor = alert.type === 'alert' ? '#FEF2F2' : '#EFF6FF';
            el.style.borderLeft = `4px solid ${alert.type === 'alert' ? '#DC2626' : '#3B82F6'}`;
            el.style.padding = '12px 16px';
            el.style.marginBottom = '8px';
            el.style.borderRadius = '4px';
            el.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
            el.style.minWidth = '250px';
            el.style.color = '#1F2937';
            el.style.fontFamily = 'Inter, sans-serif';
            el.innerHTML = `
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px;">${alert.title}</div>
        <div style="font-size: 12px; color: #4B5563;">${alert.message}</div>
      `;

            container.appendChild(el);

            // Auto dismiss after 5s
            setTimeout(() => {
                el.style.opacity = '0';
                setTimeout(() => el.remove(), 300);
            }, 5000);
        }
    };

    // Request notification permission on mount
    useEffect(() => {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }, []);

    return (
        // Invisible container for logic, actual toasts rendered into #toast-container
        // We can also create the container here if it doesn't exist
        <div style={{ display: 'none' }} />
    );
};

// Add styles globally or ensures they exist
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  #toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    pointer-events: none;
  }
  .tv-toast-slide-in {
    animation: slideIn 0.3s ease-out forwards;
    pointer-events: auto;
    transition: opacity 0.3s ease-out;
  }
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(styleSheet);

// Auto-create container if missing
if (!document.getElementById('toast-container')) {
    const div = document.createElement('div');
    div.id = 'toast-container';
    document.body.appendChild(div);
}
