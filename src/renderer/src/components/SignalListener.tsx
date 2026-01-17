import React, { useEffect, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Define the shape of our signal
interface TradingSignal {
    id: string;
    pair: string;
    message: string;
    strategy?: string;
    created_at: string;
}

export const SignalListener: React.FC = () => {
    // Keep track of processed IDs to avoid duplicate alerts on re-renders or strict mode
    const processedIds = useRef<Set<string>>(new Set());

    // Audio ref
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize audio
        // We will use a trusted online sound or a local asset if available.
        // Ideally, place 'alarm.mp3' in public or assets.
        // For now, we'll try a common notification sound URL or just TTS if fails.
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Simple beep
        audioRef.current.volume = 0.5;

        // Firestore Realtime Listener
        // Listen to the last 5 signals to catch new ones coming in
        const q = query(
            collection(db, "trading_signals"),
            orderBy("created_at", "desc"),
            limit(5)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    const newSignal = { id: change.doc.id, ...data } as TradingSignal;
                    // Only process relatively new signals (e.g. within last minute) to avoid playing old ones on reload
                    // But 'processedIds' logic handles the "don't play twice for this session" part.
                    // To avoid playing OLD signals on fresh load, we could check timestamp.
                    // For now, let's trust processedIds for session dedupe.
                    handleNewSignal(newSignal);
                }
            });
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const handleNewSignal = (signal: TradingSignal) => {
        if (processedIds.current.has(signal.id)) return;
        processedIds.current.add(signal.id);

        console.log("New Signal Received:", signal);

        // 1. Play Sound
        if (audioRef.current) {
            audioRef.current.play().catch(e => console.error("Audio play failed:", e));
        }

        // 2. Text to Speech
        speakSignal(signal);
    };

    const speakSignal = (signal: TradingSignal) => {
        if (!('speechSynthesis' in window)) return;

        // Construct the sentence
        // e.g. "Attention. DO NOT IGNORE. Gold Long Signal. Check H1."
        const textToRead = `Attention. New Signal for ${signal.pair}. ${signal.message}`;

        const utterance = new SpeechSynthesisUtterance(textToRead);

        // Try to pick a clear voice
        const voices = window.speechSynthesis.getVoices();
        // Prefer English or Turkish based on user preference, defaulting to English logic for now or simply first available
        // If message is in Turkish, it might be better to pick TR voice.
        // Let's try to detect or just use default.

        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        window.speechSynthesis.speak(utterance);
    };

    // This component doesn't render anything visible
    return null;
};
