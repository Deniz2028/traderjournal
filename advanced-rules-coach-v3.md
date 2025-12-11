# Trade Journal – Advanced Analysis v3
# Section 3: Rule Engine & Daily Discipline
# Section 4: Coaching Panel

ÖNEMLİ ÖNKOŞUL:
- Daha önce "Advanced Analysis v1" mega spec'i uygulanmış olmalı:
  - `mt5_service.py`
  - `src/main/mt5Process.ts`
  - `ipcMain.handle("mt5:getSummary", …)`
  - `window.mt5Api.getSummary(...)`
  - `AdvancedAnalysisPage.tsx` (basic metrics + equity + symbol table)
- Bu spec, **yalnızca yeni Rule/Discipline/Coach katmanını ekler**.
- Mevcut MT5 entegrasyonuna / trades backend’ine zarar vermez.

Sınırlamalar:
- MT5 verisi sadece **read-only** kullanılacak.
- Rule engine bu versiyonda:
  - Kullanıcının kendi yazdığı kuralları tutar (text tabanlı)
  - Gün sonunda, bu kurallara uyup uymadığını **manuel işaretlemesi** için checklist verir
  - Bu veriden **Discipline Score** hesaplar
- Coaching panel:
  - MT5 summary + discipline geçmişine göre **deterministik** (LLM’siz) öneriler üretir.

---

## 3. Rule Engine & Daily Discipline

### 3.1 Rule & Discipline tipleri + storage helper

#### Dosya: `src/renderer/src/utils/rulesStorage.ts`

Bu dosya yoksa oluştur, varsa **tamamını** aşağıdakiyle değiştir:

```ts
// src/renderer/src/utils/rulesStorage.ts

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
3.2 Yeni Rules sayfası (sol menüde ayrı sekme)
Kullanıcı kendi kurallarını yazıp düzenleyebilsin diye ayrı bir sayfa ekliyoruz.

3.2.1 Dosya: src/renderer/src/pages/RulesPage.tsx
tsx
Copy code
// src/renderer/src/pages/RulesPage.tsx
import React, { useEffect, useState } from "react";
import {
  getRules,
  saveRules,
  type TradeRule,
} from "../utils/rulesStorage";

export const RulesPage: React.FC = () => {
  const [rules, setRules] = useState<TradeRule[]>([]);
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    setRules(getRules());
  }, []);

  const handleToggleEnabled = (id: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r,
      ),
    );
  };

  const handleWeightChange = (id: string, weight: number) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, weight } : r,
      ),
    );
  };

  const handleLabelChange = (id: string, label: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, label } : r,
      ),
    );
  };

  const handleDescriptionChange = (id: string, description: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, description } : r,
      ),
    );
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Bu kuralı silmek istediğine emin misin?")) return;
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAddRule = () => {
    const label = newLabel.trim();
    if (!label) return;
    const id = `rule_${Date.now()}`;
    const newRule: TradeRule = {
      id,
      label,
      description: "",
      enabled: true,
      weight: 3,
    };
    setRules((prev) => [...prev, newRule]);
    setNewLabel("");
  };

  const handleSaveAll = () => {
    saveRules(rules);
    alert("Rules saved.");
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Trade Rules</h1>
        <p className="page-subtitle">
          Günlük disiplinini takip etmek için kişisel kurallarını yaz.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Buraya yazdığın kurallar, gün sonunda EOD Review ekranında checklist
          olarak görünecek. Her kural için uydum/uymadım işaretleyip
          <strong> discipline score</strong> oluşturabilirsin.
        </p>
      </div>

      {/* Yeni kural ekleme */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <input
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid var(--border-subtle)",
            fontSize: 13,
          }}
          placeholder="Örn: Plan dışı saatlerde işlem açma"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
        />
        <button
          type="button"
          onClick={handleAddRule}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            backgroundColor: "var(--accent-primary)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          + Add Rule
        </button>
      </div>

      {/* Kural listesi */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rules.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Henüz kural yok. Yukarıdan yeni kural ekleyebilirsin.
          </p>
        )}

        {rules.map((rule) => (
          <div
            key={rule.id}
            style={{
              display: "grid",
              gridTemplateColumns: "min-content 1fr min-content",
              gap: 12,
              alignItems: "flex-start",
              padding: "8px 0",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div>
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={() => handleToggleEnabled(rule.id)}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input
                style={{
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--border-subtle)",
                  fontSize: 13,
                  fontWeight: 500,
                }}
                value={rule.label}
                onChange={(e) => handleLabelChange(rule.id, e.target.value)}
              />
              <textarea
                style={{
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--border-subtle)",
                  fontSize: 12,
                  resize: "vertical",
                  minHeight: 40,
                }}
                placeholder="İstersen bu kuralı biraz daha detaylandır..."
                value={rule.description ?? ""}
                onChange={(e) =>
                  handleDescriptionChange(rule.id, e.target.value)
                }
              />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                alignItems: "flex-end",
              }}
            >
              <label
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                }}
              >
                Weight
              </label>
              <select
                value={rule.weight}
                onChange={(e) =>
                  handleWeightChange(rule.id, Number(e.target.value))
                }
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--border-subtle)",
                  fontSize: 12,
                }}
              >
                {[1, 2, 3, 4, 5].map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleDelete(rule.id)}
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: "#B91C1C",
                  backgroundColor: "#FEE2E2",
                  padding: "4px 8px",
                  borderRadius: 6,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {rules.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button
              type="button"
              onClick={handleSaveAll}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                backgroundColor: "var(--accent-primary)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Save All
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
3.3 Sidebar’a "Rules" sekmesi ekle
NOT: Burada, daha önce Advanced Analysis v1 spec’inde kullandığımız
Sidebar yapısının, wouter ile href içeren bir menü olduğunu varsayıyoruz.
Antigravity mevcut Sidebar.tsx’e bakarak uyarlamalı.

Dosya: src/renderer/src/components/Sidebar.tsx
Page union tipine "rules" ekle:

ts
Copy code
export type Page =
  | "dashboard"
  | "morning"
  | "today"
  | "calendar"
  | "advanced"
  | "rules"
  | "settings";
Menü dizine yeni bir item ekle (örnek):

ts
Copy code
const primaryItems: { id: Page; label: string; href: string }[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard" },
  { id: "morning", label: "Morning Analysis", href: "/morning" },
  { id: "today", label: "Today", href: "/today" },
  { id: "calendar", label: "Calendar", href: "/calendar" },
  { id: "advanced", label: "Advanced", href: "/advanced" },
  { id: "rules", label: "Rules", href: "/rules" },
];
3.4 Router’a /rules route’u ekle
Dosya: src/renderer/src/App.tsx veya src/renderer/src/router.tsx
RulesPage import et:

ts
Copy code
import { RulesPage } from "./pages/RulesPage";
Wouter kullanıyorsan route ekle:

tsx
Copy code
<Route path="/rules" component={RulesPage} />
3.5 EOD Review ekranına "Rules Checklist" ekleme
Burada, halihazırda bir EOD Review sayfası olduğunu varsayıyoruz
(örneğin src/renderer/src/pages/EodReviewPage.tsx):

Route: /today/:date/eod

İçerik: Gün sonu bias, notlar vb.

Dosya: src/renderer/src/pages/EodReviewPage.tsx
Bu dosyanın tamamını (veya yoksa yeni dosyayı) aşağıdaki içerikle değiştirin.
(Aşağıdaki örnek, var olan EOD text alanlarını bozmadan altına Rules ekler.
Antigravity, mevcut alanları koruyarak bu yapıyı merge edebilir.)

tsx
Copy code
// src/renderer/src/pages/EodReviewPage.tsx
import React, { useEffect, useState } from "react";
import { useRoute } from "wouter";
import {
  getRules,
  getDailyCheck,
  saveDailyCheck,
  getDisciplineScore,
  type TradeRule,
  type DailyRuleCheck,
} from "../utils/rulesStorage";

export const EodReviewPage: React.FC = () => {
  // Örn: path "/today/:date/eod"
  const [match, params] = useRoute<{ date: string }>("/today/:date/eod");
  const date = params?.date ?? new Date().toISOString().slice(0, 10);

  // Burada, daha önceki EOD metin alanların için state'ler olabilir:
  const [eodNotes, setEodNotes] = useState("");
  const [loadedEod, setLoadedEod] = useState(false);

  // Rules checklist state
  const [rules, setRules] = useState<TradeRule[]>([]);
  const [dailyCheck, setDailyCheck] = useState<DailyRuleCheck>({
    date,
    checks: [],
  });
  const [disciplineScore, setDisciplineScore] = useState<number>(0);

  useEffect(() => {
    setRules(getRules());
  }, []);

  // Gün değiştiğinde DailyRuleCheck yükle
  useEffect(() => {
    const existing = getDailyCheck(date);
    if (existing) {
      setDailyCheck(existing);
      setDisciplineScore(getDisciplineScore(date));
    } else {
      // Yeni gün için tüm kuralları obeyed=false ile başlat
      setDailyCheck({
        date,
        checks: getRules().map((r) => ({
          ruleId: r.id,
          obeyed: false,
        })),
      });
      setDisciplineScore(0);
    }
  }, [date]);

  const handleToggleRule = (ruleId: string) => {
    setDailyCheck((prev) => {
      const checks = [...prev.checks];
      const idx = checks.findIndex((c) => c.ruleId === ruleId);
      if (idx === -1) {
        checks.push({ ruleId, obeyed: true });
      } else {
        checks[idx] = {
          ...checks[idx],
          obeyed: !checks[idx].obeyed,
        };
      }
      const updated: DailyRuleCheck = { ...prev, checks };
      saveDailyCheck(updated);
      setDisciplineScore(getDisciplineScore(prev.date));
      return updated;
    });
  };

  const getObeyed = (ruleId: string): boolean => {
    const c = dailyCheck.checks.find((x) => x.ruleId === ruleId);
    return c?.obeyed ?? false;
  };

  const handleSaveEod = () => {
    // Burada EOD notlarını da localStorage veya backend'e kaydedebilirsin.
    // Şimdilik sadece alert:
    alert("EOD review saved (notes + rule checklist).");
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">EOD Review</h1>
        <p className="page-subtitle">
          Gün sonu incelemesi – {date}
        </p>
      </div>

      {/* EOD notları için basit textarea (varsa mevcut yapını bununla değiştir) */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
          Gün Sonu Notları
        </h3>
        <textarea
          style={{
            width: "100%",
            minHeight: 120,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--border-subtle)",
            fontSize: 13,
            resize: "vertical",
          }}
          placeholder="Bugün ne öğrendin? Hangi hataları yaptın? Neyi tekrar etmek istersin?"
          value={eodNotes}
          onChange={(e) => setEodNotes(e.target.value)}
        />
      </div>

      {/* Rules Checklist */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 12,
          }}
        >
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              Rules Checklist
            </h3>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              Aşağıdaki kurallar, <strong>Rules</strong> sayfasında tanımladıkların ile eşleşir.
              Bugün bu kurallara uyup uymadığını işaretle.
            </p>
          </div>
          <div
            style={{
              textAlign: "right",
              minWidth: 120,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              Discipline score
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color:
                  disciplineScore >= 80
                    ? "var(--color-green)"
                    : disciplineScore >= 50
                    ? "#F59E0B"
                    : "var(--color-red)",
              }}
            >
              {disciplineScore.toFixed(0)}%
            </div>
          </div>
        </div>

        {rules.filter((r) => r.enabled).length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Aktif kural bulunamadı. Rules sayfasından en az bir kuralı aktif et.
          </p>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: 8,
          }}
        >
          {rules
            .filter((r) => r.enabled)
            .map((rule) => (
              <label
                key={rule.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "6px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <input
                  type="checkbox"
                  checked={getObeyed(rule.id)}
                  onChange={() => handleToggleRule(rule.id)}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    {rule.label}
                  </div>
                  {rule.description && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginTop: 2,
                      }}
                    >
                      {rule.description}
                    </div>
                  )}
                </div>
              </label>
            ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 12,
          }}
        >
          <button
            type="button"
            onClick={handleSaveEod}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              backgroundColor: "var(--accent-primary)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Save EOD Review
          </button>
        </div>
      </div>
    </div>
  );
};
NOT: Eğer hâlihazırda EOD için başka state / storage kullanıyorsak,
Antigravity bu alanları merge etsin; ana ek özellik
Rules Checklist + Discipline Score kısmıdır.

4. Coaching Panel (Advanced + Discipline)
Bu bölüm, AdvancedAnalysisPage üzerine küçük bir koçluk paneli ekler:

MT5 summary (veya dummy) + son N günlük discipline history kullanır.

Basit if/else kuralları ile öneri cümleleri üretir
(LLM yok; tamamen deterministik).

4.1 Coaching tipleri ve engine
Dosya: src/renderer/src/utils/coachingEngine.ts
ts
Copy code
// src/renderer/src/utils/coachingEngine.ts
import type { Mt5Summary } from "../types/advanced";
import type { TradeRule } from "./rulesStorage";
import { getDisciplineHistory } from "./rulesStorage";

export interface CoachingAdvice {
  headline: string;
  bullets: string[];
}

/**
 * Basit heuristiklerle, performans + disiplin verisine göre tavsiyeler üretir.
 */
export function generateCoachingAdvice(
  summary: Mt5Summary | null | undefined,
  rules: TradeRule[],
): CoachingAdvice {
  const bullets: string[] = [];
  let headline = "Keep tracking your data.";

  // Disiplin geçmişi (son 14 gün)
  const history = getDisciplineHistory(14, rules);
  const avgDiscipline =
    history.length === 0
      ? null
      : history.reduce((acc, h) => acc + h.score, 0) / history.length;

  if (summary) {
    if (summary.totalTrades < 30) {
      bullets.push(
        "Henüz veri az; en az 30–50 işlem sonrası istatistiklere daha çok güvenebilirsin.",
      );
    }

    if (summary.winrate < 45 && summary.expectancy <= 0) {
      bullets.push(
        "Winrate düşük ve expectancy negatif. Risk/ödül oranını gözden geçirip stop mesafelerini yeniden ayarlamayı düşün.",
      );
    }

    if (summary.maxDrawdown > Math.abs(summary.expectancy) * 20) {
      bullets.push(
        "Max drawdown oldukça yüksek. Pozisyon boyutunu (lot size) küçültmeyi ve eş zamanlı açık işlem sayısını sınırlamayı düşün.",
      );
    }

    const bestSymbol = [...summary.symbols].sort(
      (a, b) => b.winrate - a.winrate,
    )[0];
    if (bestSymbol) {
      bullets.push(
        `En istikrarlı sembolün ${bestSymbol.symbol}. Setup'larını bu sembol üzerinde daha da netleştirerek başlayabilirsin.`,
      );
    }
  }

  if (avgDiscipline !== null) {
    if (avgDiscipline < 50) {
      bullets.push(
        "Disiplin skorun düşük. Önce kuralları basitleştirip sayıyı azalt, sonra gerçekten uygulayabildiğinden emin ol.",
      );
    } else if (avgDiscipline < 80) {
      bullets.push(
        "Disiplin fena değil ama geliştirilebilir. Özellikle zor günlerde kurallara sadık kalmaya odaklan.",
      );
    } else {
      bullets.push(
        "Disiplin skorun yüksek. Bu, uzun vadede performansın istikrarlı olması için en büyük avantajın.",
      );
    }
  } else {
    bullets.push(
      "Henüz disiplin geçmişin yok. EOD Review ekranında kurallarını işaretlemeyi alışkanlık haline getir.",
    );
  }

  // Başlık seçimi
  if (summary && summary.expectancy > 0 && (avgDiscipline ?? 0) >= 70) {
    headline = "Good edge + solid discipline. Keep compounding.";
  } else if (summary && summary.expectancy <= 0 && (avgDiscipline ?? 0) >= 70) {
    headline = "Discipline is there, edge needs refinement.";
  } else if (summary && summary.expectancy > 0 && (avgDiscipline ?? 0) < 70) {
    headline = "You have edge, but discipline is leaking.";
  } else if (avgDiscipline !== null && avgDiscipline < 50) {
    headline = "Fix discipline before adding more size.";
  }

  if (bullets.length === 0) {
    bullets.push(
      "Daha anlamlı öneriler üretmek için biraz daha veri biriktir.",
    );
  }

  return {
    headline,
    bullets,
  };
}
4.2 AdvancedAnalysisPage’e coaching panel ekleme
Dosya: src/renderer/src/pages/AdvancedAnalysisPage.tsx
Bu dosya daha önce v1 spec ile oluşmuştu.
Burada sadece ek kısımları tarif ediyoruz; Antigravity mevcut dosyaya eklemeli:

Üstte import’lara şunları ekle:

ts
Copy code
import { getRules } from "../utils/rulesStorage";
import { generateCoachingAdvice } from "../utils/coachingEngine";
Component içinde state ekle (diğer state’lerin yanına):

ts
Copy code
const [coaching, setCoaching] = useState<ReturnType<typeof generateCoachingAdvice> | null>(null);
Not: TypeScript çok kasarsa, basitçe useState<any>(null) da kullanılabilir.

handleFetch fonksiyonunda, setResult(resp); satırından SONRA şu blok eklensin:

ts
Copy code
const rules = getRules();
if (resp.ok && resp.summary) {
  const advice = generateCoachingAdvice(resp.summary, rules);
  setCoaching(advice);
} else {
  setCoaching(null);
}
Render kısmında, equity + symbol tablolarından SONRA bir de Coaching kartı ekleyelim.

Örneğin, mevcut yapıda:

tsx
Copy code
{summary && (
  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
    {/* Top metrics */}
    ...
    {/* Equity curve */}
    ...
    {/* Symbol stats */}
    <div className="card">
      <h3 style={styles.sectionTitle}>By Symbol</h3>
      <SymbolTable symbols={summary.symbols} />
    </div>
  </div>
)}
Bu bloğun hemen SONRASINA (aynı summary && içinde) şu eklenebilir:

tsx
Copy code
{summary && (
  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
    {/* Top metrics */}
    ...
    {/* Equity curve */}
    ...
    {/* Symbol stats */}
    <div className="card">
      <h3 style={styles.sectionTitle}>By Symbol</h3>
      <SymbolTable symbols={summary.symbols} />
    </div>

    {/* Coaching panel */}
    <div className="card">
      <h3 style={styles.sectionTitle}>Coach</h3>
      {coaching ? (
        <div>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            {coaching.headline}
          </p>
          <ul
            style={{
              marginLeft: 18,
              fontSize: 13,
              color: "var(--text-secondary)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {coaching.bullets.map((b, idx) => (
              <li key={idx}>{b}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Tavsiye üretmek için önce "Fetch from MT5" ile veri çekmelisin.
        </p>
      )}
    </div>
  </div>
)}
Antigravity burada tekrar eden summary && bloklarını tek bir container içinde toplayabilir;
önemli olan, Coaching panelinin Advanced sayfanın en altında bir kart olarak görünmesidir.

5. Beklenen Sonuç
Bu spec uygulandıktan sonra:

Rules sayfası:

Sol menüde ayrı sekme.

Kendi kurallarını yazıp düzenleyebileceğin bir alan.

Her kural için:

Enabled (aktif mi)

Weight (1–5)

Açıklama alanı

EOD Review sayfası:

Gün sonu notlarının altında:

Rules Checklist:

Rules sayfasındaki aktif kurallar listesi

Bugün uydum/uymadım checkbox’ları

Sağ üstte:

Discipline score (0–100, renkli)

Advanced Analysis sayfası:

MT5 (veya dummy) verine göre:

Metrikler, Equity, Symbol/Session tabloları

En altta:

Coach kartı:

Başlık (headline)

3–5 adet bullet öneri:

Edge / risk yönetimi

Max drawdown

En iyi sembol

Son 14 gün disiplin skoru

