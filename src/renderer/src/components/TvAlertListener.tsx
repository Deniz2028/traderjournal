import React, { useEffect, useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'alert' | 'info' | 'trade_setup';
    created_at: string;
    payload?: any;
}

export const TvAlertListener: React.FC = () => {
    // We use a ref to track processed IDs to avoid duplicates on re-mounts or strict mode
    const processedIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Subscribe to new notifications (global broadcast)
        // Listen to the very last one
        const q = query(
            collection(db, "notifications"),
            orderBy("created_at", "desc"),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    const newAlert = { id: change.doc.id, ...data } as Notification;

                    // Simple dedupe for session
                    if (processedIds.current.has(newAlert.id)) return;
                    processedIds.current.add(newAlert.id);

                    // Check if it's recent (optional, but good practice)
                    const isRecent = new Date().getTime() - new Date(newAlert.created_at).getTime() < 60000; // 1 min
                    if (isRecent) {
                        triggerToast(newAlert);
                        // Trigger Text-to-Speech
                        speakMessage(`${newAlert.title}. ${newAlert.message}`);
                    }
                }
            });
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const speakMessage = (text: string) => {
        if (!('speechSynthesis' in window)) return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        const voices = window.speechSynthesis.getVoices();
        const trVoice = voices.find(v => v.lang.includes('tr'));
        if (trVoice) utterance.voice = trVoice;

        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    };

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

    return (
        // Invisible container for logic, actual toasts rendered into #toast-container
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
