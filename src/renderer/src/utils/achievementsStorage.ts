import type { Achievement } from "../types/achievements";
import { migrateAchievements } from "./migrationHelper";

const STORAGE_KEY = "tj_achievements_v1";

function safeParse(raw: string | null): Achievement[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as Achievement[];
        if (!Array.isArray(parsed)) return [];
        return migrateAchievements(parsed);
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

export function updateAchievement(item: Partial<Achievement> & { id: string }): Achievement[] {
    const all = loadAchievements();
    const next = all.map(x => x.id === item.id ? { ...x, ...item } : x);
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
        // Legacy support: if no type, assume account
        const isPayout = a.type === "payout";

        if (isPayout) {
            if (a.payoutAmount) totalPayout += a.payoutAmount;
            // Legacy field fallback
            else if ((a as any).payout) totalPayout += (a as any).payout;
        } else {
            // Account
            // Only count if Phase is Funded
            if (a.phase === "Funded" && a.status !== "Failed") {
                if (a.accountSize) totalFunded += a.accountSize;
            }
        }
    }

    return { totalFunded, totalPayout };
}
