# Trade Journal – Analytics v1 (R-based performance overview)

Amaç:
- Girilen tüm **trade** verilerini kullanarak özet bir “Analytics” sayfası yapmak.
- Ekstra backend yazmadan, mevcut `tradeStorage` helper’ından gelen verilerle çalışmak.
- V1’de odak:
  - Toplam PnL, winrate, ortalama R, toplam trade
  - Sembole göre performans
  - Haftanın gününe göre performans
  - Son 10 gün için küçük günlük PnL listesi
- Sonraki versiyonlarda (v2) Morning / EOD / bias accuracy eklenecek.

> ÖNEMLİ:
> - Electron main / preload / backend dosyalarına dokunma.
> - Yeni dependency ekleme (package.json değiştirme).
> - Sadece aşağıdaki dosyaları oluştur / güncelle.
> - `tradeStorage` zaten backend ile konuşuyor, onu kullan.

---

## 1. Analytics yardımcı fonksiyonları

### File: `src/renderer/src/utils/analytics.ts`

Bu dosya yoksa oluştur, varsa **tamamını** aşağıdaki ile değiştir:

```ts
// src/renderer/src/utils/analytics.ts
import type { Trade } from "../types";

/**
 * Analytics model
 */

export interface DailyPnLPoint {
  date: string;       // "2025-12-11"
  totalR: number;     // o güne ait toplam R
  cumulativeR: number; // baştan bugüne kümülatif R
}

export interface SymbolStats {
  symbol: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number; // 0–1
  avgR: number;
  totalR: number;
}

export interface WeekdayStats {
  weekdayIndex: number; // 0 = Pazar, 1 = Pazartesi...
  weekdayLabel: string; // "Mon", "Tue"...
  trades: number;
  totalR: number;
  avgR: number;
}

export interface AnalyticsSummary {
  totalTrades: number;
  totalR: number;
  avgR: number;
  winRate: number; // 0–1
}

/**
 * Yardımcı – YYYY-MM-DD -> Date
 */
function parseISO(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

/**
 * Günlük PnL + kümülatif PnL hesapla
 */
export function buildDailyPnL(trades: Trade[]): DailyPnLPoint[] {
  const byDate = new Map<string, number>();

  for (const t of trades) {
    if (!t.date) continue;
    const prev = byDate.get(t.date) ?? 0;
    byDate.set(t.date, prev + (t.resultR ?? 0));
  }

  const dates = Array.from(byDate.keys()).sort(
    (a, b) => parseISO(a).getTime() - parseISO(b).getTime(),
  );

  const result: DailyPnLPoint[] = [];
  let cumulative = 0;

  for (const d of dates) {
    const total = byDate.get(d) ?? 0;
    cumulative += total;
    result.push({
      date: d,
      totalR: total,
      cumulativeR: cumulative,
    });
  }

  return result;
}

/**
 * Sembole göre performans
 */
export function buildSymbolStats(trades: Trade[]): SymbolStats[] {
  const bySymbol = new Map<string, Trade[]>();

  for (const t of trades) {
    const key = (t.symbol || "").toUpperCase();
    if (!key) continue;
    const arr = bySymbol.get(key) ?? [];
    arr.push(t);
    bySymbol.set(key, arr);
  }

  const result: SymbolStats[] = [];

  for (const [symbol, list] of bySymbol.entries()) {
    const tradesCount = list.length;
    if (!tradesCount) continue;

    let wins = 0;
    let losses = 0;
    let totalR = 0;

    for (const t of list) {
      const r = t.resultR ?? 0;
      totalR += r;
      if (r > 0) wins += 1;
      else if (r < 0) losses += 1;
    }

    const avgR = totalR / tradesCount;
    const winRate = tradesCount ? wins / tradesCount : 0;

    result.push({
      symbol,
      trades: tradesCount,
      wins,
      losses,
      winRate,
      avgR,
      totalR,
    });
  }

  // En çok trade edilenler en üstte
  result.sort((a, b) => b.trades - a.trades);

  return result;
}

/**
 * Haftanın gününe göre performans
 */
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function buildWeekdayStats(trades: Trade[]): WeekdayStats[] {
  const map = new Map<number, { trades: number; totalR: number }>();

  for (const t of trades) {
    if (!t.date) continue;
    const d = parseISO(t.date);
    const idx = d.getDay(); // 0..6
    const bucket = map.get(idx) ?? { trades: 0, totalR: 0 };
    bucket.trades += 1;
    bucket.totalR += t.resultR ?? 0;
    map.set(idx, bucket);
  }

  const result: WeekdayStats[] = [];

  for (let i = 0; i < 7; i += 1) {
    const bucket = map.get(i) ?? { trades: 0, totalR: 0 };
    const avgR = bucket.trades ? bucket.totalR / bucket.trades : 0;
    result.push({
      weekdayIndex: i,
      weekdayLabel: WEEKDAY_LABELS[i],
      trades: bucket.trades,
      totalR: bucket.totalR,
      avgR,
    });
  }

  // Pazartesi başa gelsin (Mon..Sun)
  return [...result.slice(1), result[0]];
}

/**
 * Genel özet
 */
export function buildSummary(trades: Trade[]): AnalyticsSummary {
  const totalTrades = trades.length;
  let totalR = 0;
  let wins = 0;

  for (const t of trades) {
    const r = t.resultR ?? 0;
    totalR += r;
    if (r > 0) wins += 1;
  }

  const avgR = totalTrades ? totalR / totalTrades : 0;
  const winRate = totalTrades ? wins / totalTrades : 0;

  return {
    totalTrades,
    totalR,
    avgR,
    winRate,
  };
}
2. Analytics sayfası
File: src/renderer/src/pages/AnalyticsPage.tsx
Bu dosyayı oluştur ve içine şunu koy:

tsx
Copy code
// src/renderer/src/pages/AnalyticsPage.tsx
import React, { useEffect, useState } from "react";
import { getTrades } from "../utils/tradeStorage";
import type { Trade } from "../types";
import {
  buildDailyPnL,
  buildSymbolStats,
  buildWeekdayStats,
  buildSummary,
} from "../utils/analytics";

export const AnalyticsPage: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    // tradeStorage backend ile konuşuyor, buradan okumamız yeterli
    const all = getTrades();
    setTrades(all);
  }, []);

  const hasData = trades.length > 0;

  const daily = buildDailyPnL(trades);
  const symbols = buildSymbolStats(trades);
  const weekdays = buildWeekdayStats(trades);
  const summary = buildSummary(trades);

  const last10 = daily.slice(-10);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">
          Performance overview based on your trade history (all R values).
        </p>
      </div>

      {!hasData && (
        <div className="card" style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            You don&apos;t have any stored trades yet. Start by adding trades on
            the <strong>Today</strong> page – analytics will update
            automatically.
          </p>
        </div>
      )}

      {hasData && (
        <>
          {/* Top summary row */}
          <div style={styles.summaryRow}>
            <div className="card" style={styles.summaryCard}>
              <span style={styles.summaryLabel}>Total PnL (R)</span>
              <span
                style={{
                  ...styles.summaryValue,
                  color:
                    summary.totalR >= 0
                      ? "var(--color-green)"
                      : "var(--color-red)",
                }}
              >
                {summary.totalR.toFixed(2)} R
              </span>
            </div>

            <div className="card" style={styles.summaryCard}>
              <span style={styles.summaryLabel}>Total trades</span>
              <span style={styles.summaryValue}>{summary.totalTrades}</span>
            </div>

            <div className="card" style={styles.summaryCard}>
              <span style={styles.summaryLabel}>Avg R / trade</span>
              <span style={styles.summaryValue}>
                {summary.avgR.toFixed(2)} R
              </span>
            </div>

            <div className="card" style={styles.summaryCard}>
              <span style={styles.summaryLabel}>Winrate</span>
              <span style={styles.summaryValue}>
                {(summary.winRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Equity-ish list */}
          <div className="card" style={{ marginTop: 24 }}>
            <h3 style={styles.sectionTitle}>Last 10 days – daily &amp; equity</h3>
            <p style={styles.sectionHint}>
              Simple table instead of charts for now. Each row shows daily R and
              cumulative equity.
            </p>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Daily R</th>
                  <th style={styles.th}>Cumulative R</th>
                </tr>
              </thead>
              <tbody>
                {last10.map((d) => (
                  <tr key={d.date}>
                    <td style={styles.td}>{d.date}</td>
                    <td
                      style={{
                        ...styles.td,
                        color:
                          d.totalR >= 0
                            ? "var(--color-green)"
                            : "var(--color-red)",
                      }}
                    >
                      {d.totalR >= 0 ? "+" : ""}
                      {d.totalR.toFixed(2)} R
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        fontWeight: 600,
                        color:
                          d.cumulativeR >= 0
                            ? "var(--color-green)"
                            : "var(--color-red)",
                      }}
                    >
                      {d.cumulativeR >= 0 ? "+" : ""}
                      {d.cumulativeR.toFixed(2)} R
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Symbol performance */}
          <div className="card" style={{ marginTop: 24 }}>
            <h3 style={styles.sectionTitle}>Symbol performance</h3>
            <p style={styles.sectionHint}>
              How each instrument performs: trades, winrate and total R.
            </p>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Symbol</th>
                  <th style={styles.th}>Trades</th>
                  <th style={styles.th}>Winrate</th>
                  <th style={styles.th}>Avg R</th>
                  <th style={styles.th}>Total R</th>
                </tr>
              </thead>
              <tbody>
                {symbols.map((s) => (
                  <tr key={s.symbol}>
                    <td style={styles.td}>{s.symbol}</td>
                    <td style={styles.td}>{s.trades}</td>
                    <td style={styles.td}>
                      {(s.winRate * 100).toFixed(1)}%
                    </td>
                    <td style={styles.td}>{s.avgR.toFixed(2)}</td>
                    <td
                      style={{
                        ...styles.td,
                        fontWeight: 600,
                        color:
                          s.totalR >= 0
                            ? "var(--color-green)"
                            : "var(--color-red)",
                      }}
                    >
                      {s.totalR >= 0 ? "+" : ""}
                      {s.totalR.toFixed(2)} R
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Weekday stats */}
          <div className="card" style={{ marginTop: 24, marginBottom: 32 }}>
            <h3 style={styles.sectionTitle}>Day of week performance</h3>
            <p style={styles.sectionHint}>
              Which weekdays you perform better or worse on.
            </p>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Day</th>
                  <th style={styles.th}>Trades</th>
                  <th style={styles.th}>Avg R</th>
                  <th style={styles.th}>Total R</th>
                </tr>
              </thead>
              <tbody>
                {weekdays.map((w) => (
                  <tr key={w.weekdayLabel}>
                    <td style={styles.td}>{w.weekdayLabel}</td>
                    <td style={styles.td}>{w.trades}</td>
                    <td
                      style={{
                        ...styles.td,
                        color:
                          w.avgR >= 0
                            ? "var(--color-green)"
                            : "var(--color-red)",
                      }}
                    >
                      {w.avgR.toFixed(2)}
                    </td>
                    <td
                      style={{
                        ...styles.td,
                        fontWeight: 600,
                        color:
                          w.totalR >= 0
                            ? "var(--color-green)"
                            : "var(--color-red)",
                      }}
                    >
                      {w.totalR >= 0 ? "+" : ""}
                      {w.totalR.toFixed(2)} R
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  summaryRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 16,
  },
  summaryCard: {
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 700,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: "var(--text-secondary)",
    marginBottom: 12,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: "10px 16px",
    borderBottom: "1px solid var(--border-subtle)",
    color: "var(--text-secondary)",
    fontWeight: 600,
  },
  td: {
    padding: "8px 16px",
    borderBottom: "1px solid var(--border-subtle)",
  },
};
3. Sidebar’a “Analytics” ekle
File: src/renderer/src/components/Sidebar.tsx
Bu dosyada halihazırda Page tipi ve menü var.
Aşağıdaki değişiklikleri yap:

Page tipine "analytics" ekle:

ts
Copy code
export type Page =
  | "dashboard"
  | "analytics"   // <-- yeni
  | "morning"
  | "today"
  | "calendar"
  | "settings";
primaryItems dizisine Dashboard’dan hemen sonra Analytics’i ekle:

ts
Copy code
const primaryItems: { id: Page; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "analytics", label: "Analytics" }, // <-- yeni
  { id: "morning", label: "Morning Analysis" },
  { id: "today", label: "Today" },
  { id: "calendar", label: "Calendar" },
];
Başka değişiklik yapma.

4. App router’a yeni route ekle
File: src/renderer/src/App.tsx
Bu dosyada wouter kullanarak route’lar tanımlanıyor.
Aşağıdaki gibi sadece ekleme yap:

En üstte yeni import:

ts
Copy code
import { AnalyticsPage } from "./pages/AnalyticsPage";
Route’ların olduğu kısımda, Dashboard route’undan sonra yeni bir route:

tsx
Copy code
<Route path="/analytics">
  <AnalyticsPage />
</Route>
Örnek (sadece fikir vermek için):

tsx
Copy code
<Switch>
  <Route path="/dashboard">
    <DashboardPage />
  </Route>
  <Route path="/analytics">
    <AnalyticsPage />
  </Route>
  <Route path="/morning/:date?">
    <MorningAnalysisPage />
  </Route>
  ...
</Switch>
Mevcut sırayı bozmadan, sadece /analytics satırını ekle.

5. Beklenen sonuç
npm run dev ile:

Sidebar’da Analytics diye yeni bir item göreceksin.

Today sayfasından trade ekledikçe, Analytics:

Toplam R, toplam trade, winrate, avg R gösterir.

Hangi sembolde kaç trade, winrate ve total R olduğunu listeler.

Haftanın günlerine göre performansı tablo halinde gösterir.

Son 10 günün günlük R ve equity bilgisini tablo halinde gösterir.