# Trade Journal – Data Setup Specification (localStorage + Today page)

We will extend the existing Trade Journal Electron + React UI to:

1. Define a reusable `Trade` type.
2. Add a small storage helper that uses `localStorage`.
3. Make the **Today** page read and write real trades via this storage helper.

The base project is already created by `npm create electron-vite@latest` with React + TS,
and the UI is already implemented under `src/renderer/src` (Sidebar, Dashboard, etc.).

**IMPORTANT CONSTRAINTS**

- Do NOT touch `package.json`, `tsconfig.*`, or Electron config files.
- Only create or update the files explicitly listed below.
- When updating a file, replace its entire contents with the code block in this spec.
- Keep all paths exactly as written.

---

## 1. New type definition – `Trade`

### File: `src/renderer/src/types.ts`

Create this file if it does not exist. Replace its entire contents with:

```ts
// src/renderer/src/types.ts

export type Direction = "Long" | "Short";
export type ReviewStatus = "Reviewed" | "Pending";

export interface Trade {
  id: string;          // unique id (uuid string)
  date: string;        // ISO date string, e.g. "2025-12-10"
  symbol: string;
  dir: Direction;
  resultR: number;     // result in R (1.5, -0.5, etc.)
  time: string;        // e.g. "09:30"
  status: ReviewStatus;
}
2. New storage helper – tradeStorage
File: src/renderer/src/utils/tradeStorage.ts
If src/renderer/src/utils does not exist, create the folder.

Then create the file src/renderer/src/utils/tradeStorage.ts with the following content:

ts
Copy code
// src/renderer/src/utils/tradeStorage.ts
import type { Trade } from "../types";

const STORAGE_KEY = "tj_trades_v1";

export function getTrades(): Trade[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Trade[];
  } catch {
    return [];
  }
}

export function saveTrades(trades: Trade[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

export function addTrade(trade: Trade) {
  const trades = getTrades();
  trades.push(trade);
  saveTrades(trades);
}

/**
 * Helper to get trades for a specific month.
 * monthIndex0: 0 = January, 11 = December
 */
export function getTradesForMonth(year: number, monthIndex0: number): Trade[] {
  return getTrades().filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === monthIndex0;
  });
}
3. Update Today page to use real trades
We will replace the existing Today page implementation with a version
that:

Loads all trades from localStorage on mount.

Filters them by today's date.

Displays them in the table.

Provides a + Add trade button that opens a modal with a small form.

Saves the new trade to localStorage and updates the UI.

File: src/renderer/src/pages/TodayPage.tsx
Replace the entire contents of src/renderer/src/pages/TodayPage.tsx
with the following:

tsx
Copy code
// src/renderer/src/pages/TodayPage.tsx
import React, { useEffect, useState } from "react";
import type { Trade, Direction, ReviewStatus } from "../types";
import { getTrades, addTrade } from "../utils/tradeStorage";

const directions: Direction[] = ["Long", "Short"];
const statuses: ReviewStatus[] = ["Pending", "Reviewed"];

export const TodayPage: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Form state for new trade
  const [symbol, setSymbol] = useState("XAUUSD");
  const [dir, setDir] = useState<Direction>("Long");
  const [resultR, setResultR] = useState<string>("1.0");
  const [time, setTime] = useState("09:30");
  const [status, setStatus] = useState<ReviewStatus>("Pending");

  // Today's date as ISO string (YYYY-MM-DD)
  const todayISO = new Date().toISOString().slice(0, 10);

  // Load trades from localStorage once on mount
  useEffect(() => {
    setTrades(getTrades());
  }, []);

  const handleAddTrade = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedR = Number(resultR.replace(",", "."));
    if (Number.isNaN(parsedR)) {
      alert("Result (R) must be a number.");
      return;
    }

    const newTrade: Trade = {
      id: crypto.randomUUID(),
      date: todayISO,
      symbol: symbol.trim().toUpperCase(),
      dir,
      resultR: parsedR,
      time,
      status,
    };

    addTrade(newTrade);
    setTrades((prev) => [...prev, newTrade]);
    setShowModal(false);
  };

  const todaysTrades = trades.filter((t) => t.date === todayISO);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Today</h1>
        <p className="page-subtitle">Today's trades &amp; review ({todayISO})</p>
      </div>

      {/* Add trade button */}
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button style={styles.addBtn} onClick={() => setShowModal(true)}>
          + Add trade
        </button>
      </div>

      {/* Trades table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={styles.th}>Symbol</th>
              <th style={styles.th}>Direction</th>
              <th style={styles.th}>Result (R)</th>
              <th style={styles.th}>Time</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {todaysTrades.map((trade) => (
              <tr key={trade.id} style={styles.row}>
                <td style={styles.td}>{trade.symbol}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.badge,
                      backgroundColor:
                        trade.dir === "Long" ? "#ECFDF5" : "#FEF2F2",
                      color: trade.dir === "Long" ? "#059669" : "#DC2626",
                    }}
                  >
                    {trade.dir}
                  </span>
                </td>
                <td
                  style={{
                    ...styles.td,
                    fontWeight: 600,
                    color:
                      trade.resultR >= 0
                        ? "var(--color-green)"
                        : "var(--color-red)",
                  }}
                >
                  {trade.resultR.toFixed(2)} R
                </td>
                <td style={styles.td}>{trade.time}</td>
                <td style={styles.td}>{trade.status}</td>
              </tr>
            ))}

            {todaysTrades.length === 0 && (
              <tr>
                <td style={styles.emptyTd} colSpan={5}>
                  Today you have no trades yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for adding a new trade */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.modalContent}>
            <h3 style={{ marginBottom: 12 }}>New trade</h3>
            <form onSubmit={handleAddTrade} style={styles.form}>
              <div style={styles.formRow}>
                <label style={styles.label}>Symbol</label>
                <input
                  style={styles.input}
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                />
              </div>

              <div style={styles.formRow}>
                <label style={styles.label}>Direction</label>
                <select
                  style={styles.input}
                  value={dir}
                  onChange={(e) => setDir(e.target.value as Direction)}
                >
                  {directions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formRow}>
                <label style={styles.label}>Result (R)</label>
                <input
                  style={styles.input}
                  value={resultR}
                  onChange={(e) => setResultR(e.target.value)}
                  placeholder="1.5, -0.5..."
                />
              </div>

              <div style={styles.formRow}>
                <label style={styles.label}>Time</label>
                <input
                  style={styles.input}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="09:30"
                />
              </div>

              <div style={styles.formRow}>
                <label style={styles.label}>Status</label>
                <select
                  style={styles.input}
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as ReviewStatus)
                  }
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.saveBtn}>
                  Save trade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 14,
  },
  headerRow: {
    backgroundColor: "#F9FAFB",
    borderBottom: "1px solid var(--border-subtle)",
  },
  th: {
    textAlign: "left",
    padding: "16px 24px",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  row: {
    borderBottom: "1px solid var(--border-subtle)",
  },
  td: {
    padding: "16px 24px",
    color: "var(--text-primary)",
  },
  emptyTd: {
    padding: "16px 24px",
    color: "var(--text-secondary)",
    textAlign: "center",
  },
  badge: {
    padding: "4px 8px",
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
  },
  addBtn: {
    backgroundColor: "var(--accent-primary)",
    color: "#ffffff",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  modalContent: {
    width: 420,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  formRow: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  input: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid var(--border-subtle)",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
  },
  cancelBtn: {
    backgroundColor: "#F3F4F6",
    color: "var(--text-primary)",
    padding: "8px 14px",
    borderRadius: 6,
    fontSize: 13,
  },
  saveBtn: {
    backgroundColor: "var(--accent-primary)",
    color: "#ffffff",
    padding: "8px 14px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
  },
};
4. After the agent finishes
After all files above are created/updated:

The agent must NOT run npm install or npm run dev.

The human user (you) will already be running npm run dev or can start it manually.

At this point:

The Today page should:

Show trades stored in localStorage for today's date.

Allow adding a new trade via the + Add trade modal.

Persist trades between app restarts via localStorage.

End of specification.

yaml
Copy code

---

Bunu aynen `setup-veri.md` olarak kaydet → Antigravity’de projeyi aç →  
“**Use markdown spec** / `setup-veri.md`’yi uygula” tarzı bir prompt ver, gerisini o halletsin.

Bitince Today sayfasına geç, birkaç trade ekle; çalışıyorsa sonraki adımda Calendar’ı da bu veriden besleyen ikinci bir `setup-calendar.md` yazarız.
::contentReference[oaicite:0]{index=0}






You said:



uygulamaya bir kaç bir şey eklemek istiyorum 
morning analiz kısmı bu şekilde değil de daha farklı istiyorum bunu sana çizerek atıcam tablette çizicem burayı ona göre yap 
mesela ben telegramda analizlerimi sabah kendimce paylaşıyorum orayı ama bu sefer kendi uygulamama yazmak istiyorum
sonrasında bunu arşivlesin 
calenderda o günün işlemi alınmışsa mesela orda alınan parite yazsın eğer tp ise uygun bir emoji değilse başka bir emoji altına tabi gene R yazsın 

sornasında setting kısmın en aşağıya alalım 

setting kısmından dashboarda istedğimiz pariteye ekleme yapalım o gün için pariteyi seçtirsin 8 major parite nasdaq ve dxy altın gümüş olsun seçilebilecek paritelerde 

şimdi sana morning analis kısmını çizip atıcam şimdilik bunları yapalım

ChatGPT said:

Thought for 1m 4s
Ooo uygulama çok iyi görünmeye başlamış. 🥹
Şimdi istediğin eklemeler için yine Antigravity’ye verebileceğin bir spec MD hazırlayalım.

Aşağıdakini tamamını kopyalayıp proje köküne
setup-features-01.md adıyla kaydet → Antigravity’de “bu dosyayı uygula” de.

md
Copy code
# Trade Journal – Features v1
# (Calendar + Emojis, Sidebar order, Dashboard instruments via Settings)

Base assumptions:

- Project was created with `npm create electron-vite@latest` (React + TS).
- UI from previous `setup.md` + `setup-veri.md` already exists:
  - `Trade` type & `tradeStorage.ts`
  - Sidebar + Dashboard + Today + Calendar + Settings pages
- Do NOT touch `package.json`, Electron config or tsconfig files.

Only modify the files listed below, or create new ones exactly at the given paths.

---

## 1. Settings storage helper

### File: `src/renderer/src/utils/settingsStorage.ts`

If the `utils` folder does not exist under `src/renderer/src`, create it.

Then create/replace `src/renderer/src/utils/settingsStorage.ts` with:

```ts
// src/renderer/src/utils/settingsStorage.ts

const DASHBOARD_INSTRUMENTS_KEY = "tj_dashboard_instruments_v1";

/**
 * All instruments that can be selected in Settings.
 * 8 majors + NASDAQ + DXY + Gold + Silver.
 */
export const ALL_INSTRUMENTS: string[] = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "NZDUSD",
  "USDCAD",
  "USDCHF",
  "EURJPY",
  "NAS100",
  "DXY",
  "XAUUSD",
  "XAGUSD",
];

const DEFAULT_INSTRUMENTS: string[] = [
  "XAUUSD",
  "EURUSD",
  "GBPUSD",
  "NAS100",
];

export function getDashboardInstruments(): string[] {
  if (typeof window === "undefined") {
    return DEFAULT_INSTRUMENTS;
  }

  try {
    const raw = window.localStorage.getItem(DASHBOARD_INSTRUMENTS_KEY);
    if (!raw) return DEFAULT_INSTRUMENTS;
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_INSTRUMENTS;
    }
    return parsed;
  } catch {
    return DEFAULT_INSTRUMENTS;
  }
}

export function saveDashboardInstruments(instruments: string[]) {
  if (typeof window === "undefined") return;
  const filtered = instruments.filter((x) => ALL_INSTRUMENTS.includes(x));
  window.localStorage.setItem(
    DASHBOARD_INSTRUMENTS_KEY,
    JSON.stringify(filtered),
  );
}
2. Sidebar – move Settings to the bottom
File: src/renderer/src/components/Sidebar.tsx
Replace the entire file with:

tsx
Copy code
// src/renderer/src/components/Sidebar.tsx
import React from "react";

export type Page = "dashboard" | "morning" | "today" | "calendar" | "settings";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const primaryItems: { id: Page; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "morning", label: "Morning Analysis" },
  { id: "today", label: "Today" },
  { id: "calendar", label: "Calendar" },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
}) => {
  return (
    <div style={styles.sidebar}>
      <div style={styles.logoArea}>
        <h2 style={styles.logoText}>Trade Journal</h2>
      </div>

      {/* Top menu items */}
      <nav style={styles.nav}>
        {primaryItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Spacer pushes Settings to the very bottom */}
      <div style={{ flexGrow: 1 }} />

      {/* Settings at bottom */}
      <nav style={styles.navBottom}>
        <button
          onClick={() => onNavigate("settings")}
          style={{
            ...styles.navItem,
            ...(currentPage === "settings" ? styles.navItemActive : {}),
          }}
        >
          Settings
        </button>
      </nav>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: "var(--sidebar-width)",
    height: "100%",
    backgroundColor: "var(--bg-sidebar)",
    borderRight: "1px solid var(--border-subtle)",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
  },
  logoArea: {
    padding: "24px",
    borderBottom: "1px solid var(--border-subtle)",
    marginBottom: "16px",
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    color: "var(--text-primary)",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    padding: "0 12px",
    gap: 4,
  },
  navBottom: {
    display: "flex",
    flexDirection: "column",
    padding: "12px",
    borderTop: "1px solid var(--border-subtle)",
  },
  navItem: {
    textAlign: "left",
    padding: "10px 16px",
    borderRadius: 8,
    backgroundColor: "transparent",
    color: "var(--text-secondary)",
    fontSize: 14,
    fontWeight: 500,
    transition: "all 0.2s ease",
  },
  navItemActive: {
    backgroundColor: "#F3F4F6",
    color: "var(--text-primary)",
    fontWeight: 600,
  },
};
NOTE: Ensure App.tsx still imports Sidebar as a named import:
import { Sidebar } from "./components/Sidebar";

3. Settings page – choose dashboard instruments
File: src/renderer/src/pages/SettingsPage.tsx
Replace the file with:

tsx
Copy code
// src/renderer/src/pages/SettingsPage.tsx
import React, { useEffect, useState } from "react";
import {
  ALL_INSTRUMENTS,
  getDashboardInstruments,
  saveDashboardInstruments,
} from "../utils/settingsStorage";

export const SettingsPage: React.FC = () => {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    setSelected(getDashboardInstruments());
  }, []);

  const toggleInstrument = (symbol: string) => {
    setSelected((prev) =>
      prev.includes(symbol)
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol],
    );
  };

  const handleSave = () => {
    saveDashboardInstruments(selected);
    alert("Dashboard instruments saved.");
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">
          Choose which instruments you want to see on the dashboard.
        </p>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            You can pick your main focus instruments for today. These will
            appear on the Dashboard in the “Today&apos;s focus” area.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 8,
          }}
        >
          {ALL_INSTRUMENTS.map((symbol) => {
            const isActive = selected.includes(symbol);
            return (
              <button
                key={symbol}
                type="button"
                onClick={() => toggleInstrument(symbol)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: isActive
                    ? "1px solid var(--accent-primary)"
                    : "1px solid var(--border-subtle)",
                  backgroundColor: isActive ? "#EFF6FF" : "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 500,
                  textAlign: "center",
                }}
              >
                {symbol}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleSave}
            style={{
              backgroundColor: "var(--accent-primary)",
              color: "#FFFFFF",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
4. Dashboard – show “Today’s focus” instruments
File: src/renderer/src/pages/DashboardPage.tsx
Replace the file with:

tsx
Copy code
// src/renderer/src/pages/DashboardPage.tsx
import React from "react";
import { getDashboardInstruments } from "../utils/settingsStorage";

export const DashboardPage: React.FC = () => {
  const focus = getDashboardInstruments();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Weekly overview</p>
      </div>

      {/* Weekly stats row (unchanged dummy data) */}
      <div style={styles.statsRow}>
        {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, idx) => (
          <div key={day} className="card" style={styles.statCard}>
            <span style={styles.dayLabel}>{day}</span>
            <span
              style={{
                ...styles.resultText,
                color:
                  idx === 2
                    ? "var(--color-red)"
                    : idx === 4
                    ? "var(--text-secondary)"
                    : "var(--color-green)",
              }}
            >
              {idx === 2 ? "-2.1 R" : idx === 4 ? "0 R" : "+1.2 R"}
            </span>
            <span style={styles.tradeCount}>3 trades</span>
          </div>
        ))}
      </div>

      {/* Today's focus instruments driven by Settings */}
      <div style={{ marginTop: 32 }}>
        <h3 style={styles.sectionTitle}>Today&apos;s focus</h3>
        <div style={styles.focusRow}>
          {focus.map((symbol) => (
            <div key={symbol} className="card" style={styles.focusCard}>
              <span style={styles.focusSymbol}>{symbol}</span>
              <span style={styles.focusNote}>Watch plan for today</span>
            </div>
          ))}
          {focus.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Select instruments in Settings to see them here.
            </p>
          )}
        </div>
      </div>

      {/* Recent trades (unchanged simple list) */}
      <div style={{ marginTop: 32 }}>
        <h3 style={styles.sectionTitle}>Recent trades</h3>
        <div className="card" style={styles.recentBox}>
          <div style={styles.recentRow}>
            <span style={styles.symbol}>XAUUSD</span>
            <span style={{ color: "var(--color-green)", fontWeight: 600 }}>
              +1.2 R
            </span>
          </div>
          <div style={{ ...styles.recentRow, border: "none" }}>
            <span style={styles.symbol}>EURUSD</span>
            <span style={{ color: "var(--color-red)", fontWeight: 600 }}>
              -0.6 R
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: 16,
  },
  statCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  resultText: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 4,
  },
  tradeCount: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 16,
    color: "var(--text-primary)",
  },
  focusRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
  },
  focusCard: {
    minWidth: 120,
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  focusSymbol: {
    fontSize: 14,
    fontWeight: 600,
  },
  focusNote: {
    fontSize: 12,
    color: "var(--text-secondary)",
  },
  recentBox: {
    padding: 0,
  },
  recentRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "16px 24px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  symbol: {
    fontWeight: 500,
  },
};
5. Calendar – use real trades + emoji + symbol
This step assumes:

Trade type and getTradesForMonth helper already exist in:

src/renderer/src/types.ts

src/renderer/src/utils/tradeStorage.ts

The goal:

For the current month, read all trades from storage.

For each day cell:

If no trades: show just the day number.

If there are trades:

Show the first trade’s symbol.

Compute total R for that day (sum of resultR).

Show an emoji:

✅ if total R > 0

❌ if total R < 0

⚪ if total R === 0

File: src/renderer/src/pages/CalendarPage.tsx
Replace with:

tsx
Copy code
// src/renderer/src/pages/CalendarPage.tsx
import React from "react";
import type { Trade } from "../types";
import { getTradesForMonth } from "../utils/tradeStorage";

export const CalendarPage: React.FC = () => {
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth(); // 0-based
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const trades: Trade[] = getTradesForMonth(year, monthIndex);

  const getDayInfo = (day: number) => {
    const dateISO = new Date(year, monthIndex, day).toISOString().slice(0, 10);
    const list = trades.filter((t) => t.date === dateISO);
    if (list.length === 0) return null;

    const totalR = list.reduce((acc, t) => acc + t.resultR, 0);
    const symbol = list[0].symbol;

    let emoji = "⚪";
    if (totalR > 0.0001) emoji = "✅";
    else if (totalR < -0.0001) emoji = "❌";

    return {
      symbol,
      totalR,
      emoji,
    };
  };

  const dayBoxes = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const info = getDayInfo(day);
    dayBoxes.push(
      <div key={day} style={styles.dayBox}>
        <span style={styles.dayNumber}>{day}</span>
        {info && (
          <div style={styles.pnlTagContainer}>
            <div style={styles.symbolRow}>
              <span>{info.symbol}</span>
              <span style={{ marginLeft: 4 }}>{info.emoji}</span>
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color:
                  info.totalR > 0
                    ? "var(--color-green)"
                    : info.totalR < 0
                    ? "var(--color-red)"
                    : "var(--text-secondary)",
              }}
            >
              {info.totalR.toFixed(2)}R
            </div>
          </div>
        )}
      </div>,
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Calendar</h1>
        <p className="page-subtitle">
          Daily performance overview ({year}-{monthIndex + 1})
        </p>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div style={styles.grid}>{dayBoxes}</div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 12,
  },
  dayBox: {
    minHeight: 100,
    border: "1px solid #F3F4F6",
    borderRadius: 8,
    padding: 8,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: 600,
    color: "#9CA3AF",
  },
  pnlTagContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    alignItems: "flex-start",
  },
  symbolRow: {
    fontSize: 11,
    fontWeight: 500,
    display: "flex",
    alignItems: "center",
  },
};
6. After the agent finishes
The agent MUST NOT run npm install or npm run dev.

The human user (you) can run:

bash
Copy code
npm run dev
Expected results:

Sidebar:

Dashboard / Morning Analysis / Today / Calendar at the top.

Settings button pinned at the bottom of the sidebar.

Settings:

Shows buttons for 8 majors + NAS100 + DXY + Gold + Silver.

Selected symbols are saved and used on the Dashboard.

Dashboard:

“Today’s focus” section shows the selected instruments from Settings.

Calendar:

For each day with trades (from Today page / localStorage):

Shows the first trade’s symbol.

Shows ✅ if daily total R > 0, ❌ if < 0, ⚪ if exactly 0.

Shows total R for that day under the emoji.

End of specification.







