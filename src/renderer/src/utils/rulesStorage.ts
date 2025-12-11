
export interface TradeRule {
    id: string;
    label: string;
    description?: string;
    enabled: boolean;
    weight: number; // 1–5: önem derecesi
}

export interface RuleCheck {
    ruleId: string;
    obeyed: boolean;
}

export interface DailyRuleCheck {
    date: string; // "YYYY-MM-DD"
    checks: RuleCheck[];
}

const RULES_KEY = "tj_rules_v1";
const DAILY_CHECKS_KEY = "tj_rules_daily_v1";

function safeParse<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

// Varsayılan birkaç örnek kural (kullanıcı isterse siler/düzenler)
const DEFAULT_RULES: TradeRule[] = [
    {
        id: "max_trades",
        label: "Günde maksimum 3 işlem",
        description: "3 işlemden fazla açma.",
        enabled: true,
        weight: 5,
    },
    {
        id: "no_revenge",
        label: "Revenge trade yok",
        description: "Arka arkaya 2 kayıptan sonra yeni sistem dışı işlem açma.",
        enabled: true,
        weight: 5,
    },
    {
        id: "session_only",
        label: "Sadece planlı seanslarda işlem",
        description: "Londra/NY dışı spontan işlem açma.",
        enabled: false,
        weight: 3,
    },
];

export function getRules(): TradeRule[] {
    if (typeof window === "undefined") return DEFAULT_RULES;
    const parsed = safeParse<TradeRule[]>(window.localStorage.getItem(RULES_KEY));
    if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
        return DEFAULT_RULES;
    }
    // id'si olmayanları filtrele
    return parsed.filter((r) => !!r.id);
}

export function saveRules(rules: TradeRule[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

export function getAllDailyChecks(): DailyRuleCheck[] {
    if (typeof window === "undefined") return [];
    const parsed = safeParse<DailyRuleCheck[]>(window.localStorage.getItem(DAILY_CHECKS_KEY));
    if (!parsed || !Array.isArray(parsed)) return [];
    return parsed;
}

export function getDailyCheck(date: string): DailyRuleCheck | null {
    const all = getAllDailyChecks();
    return all.find((d) => d.date === date) ?? null;
}

export function saveDailyCheck(report: DailyRuleCheck) {
    if (typeof window === "undefined") return;
    const all = getAllDailyChecks().filter((d) => d.date !== report.date);
    all.push(report);
    window.localStorage.setItem(DAILY_CHECKS_KEY, JSON.stringify(all));
}

/**
 * Verilen gün için, aktif (enabled) kurallara göre disiplin skorunu hesaplar.
 * Skor: 0–100 arası.
 */
export function getDisciplineScore(
    date: string,
    rules: TradeRule[] = getRules(),
): number {
    const activeRules = rules.filter((r) => r.enabled);
    if (activeRules.length === 0) return 0;

    const daily = getDailyCheck(date);
    if (!daily) return 0;

    const byId = new Map<string, RuleCheck>();
    daily.checks.forEach((c) => byId.set(c.ruleId, c));

    let totalWeight = 0;
    let gained = 0;

    for (const rule of activeRules) {
        totalWeight += rule.weight;
        const check = byId.get(rule.id);
        if (check && check.obeyed) {
            gained += rule.weight;
        }
    }

    if (totalWeight === 0) return 0;
    return (gained / totalWeight) * 100;
}

/**
 * Son N gün için disiplin geçmişi.
 */
export function getDisciplineHistory(
    days: number,
    rules: TradeRule[] = getRules(),
): { date: string; score: number }[] {
    const all = getAllDailyChecks();
    // tarih stringlerini sıralamayı biraz basit tutuyoruz
    const sorted = [...all].sort((a, b) => a.date.localeCompare(b.date));
    const lastN = sorted.slice(-days);
    return lastN.map((d) => ({
        date: d.date,
        score: getDisciplineScore(d.date, rules),
    }));
}
