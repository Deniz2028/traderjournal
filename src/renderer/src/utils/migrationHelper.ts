import { Achievement, EvaluationPhase, PhaseStatus } from "../types/achievements";

export function migrateAchievements(items: any[]): Achievement[] {
    return items.map(item => {
        if (item.phase && item.status) return item; // Already migrated

        let phase: EvaluationPhase = "Phase 1";
        let status: PhaseStatus = "Ongoing";

        // Map legacy status
        const oldStatus = item.status || "Phase 1";

        if (oldStatus === "Phase 1") {
            phase = "Phase 1";
            status = "Ongoing";
        } else if (oldStatus === "Phase 2") {
            phase = "Phase 2";
            status = "Ongoing";
        } else if (oldStatus === "Funded") {
            phase = "Funded";
            status = "Ongoing";
        } else if (oldStatus === "Lost") {
            // Assume Phase 1 Failed if generic 'Lost', or try to guess. 
            // Default to Phase 1 Failed for safety.
            phase = "Phase 1";
            status = "Failed";
        }

        return {
            ...item,
            phase,
            status
        };
    });
}
