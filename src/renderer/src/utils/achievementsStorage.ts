// src/renderer/src/utils/achievementsStorage.ts
import type { Achievement } from "../types/achievements";

const STORAGE_KEY = "tj_achievements_v1";

function safeParse(raw: string | null): Achievement[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as Achievement[];
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch {
        return [];
    }
}

export function loadAchievements(): Achievement[] {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return safeParse(raw);
}

export function saveAchievements(list: Achievement[]): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function addAchievement(item: Achievement): Achievement[] {
    const all = loadAchievements();
    const next = [...all, item];
    saveAchievements(next);
    return next;
}

export function removeAchievement(id: string): Achievement[] {
    const all = loadAchievements();
    const next = all.filter((a) => a.id !== id);
    saveAchievements(next);
    return next;
}

/**
 * Aggregated totals for header
 */
export function getTotals(list: Achievement[]): {
    totalFunded: number;
    totalPayout: number;
} {
    let totalFunded = 0;
    let totalPayout = 0;

    for (const a of list) {
        if (a.accountSize) totalFunded += a.accountSize;
        if (a.payout) totalPayout += a.payout;
    }

    return { totalFunded, totalPayout };
}
