# Trade Journal – Backend Step 1 (File-based trade storage via Electron main)

Goal: Move **trades** persistence out of the renderer (localStorage) into
the Electron main process, using a JSON file under `app.getPath("userData")`.

Renderer (React) will talk to main via IPC exposed in `preload.ts`.

We will:

- Add a small trade repository in `src/main`.
- Add IPC handlers in `src/main/main.ts`.
- Expose a typed API in `src/preload/index.ts`.
- Update renderer helpers (`tradeStorage.ts`) to use this API instead of localStorage.
- Keep the **Trade type** as-is in `src/renderer/src/types.ts`.

## IMPORTANT

- Do NOT change the overall project structure.
- You MAY modify `main.ts`, `preload/index.ts`, and the renderer files listed below.
- Do NOT add external dependencies; use Node's built-in `fs` and `path` only.
- Do NOT touch `package.json` unless absolutely required (it should not be needed).

---

## 1. Main-side trade repository

### File: `src/main/tradeRepo.ts`

Create this file with the following content:

```ts
// src/main/tradeRepo.ts
import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

export type Direction = "Long" | "Short";
export type ReviewStatus = "Reviewed" | "Pending";

export interface Trade {
  id: string;
  date: string;     // "YYYY-MM-DD"
  symbol: string;
  dir: Direction;
  resultR: number;
  time: string;     // "HH:mm"
  status: ReviewStatus;
}

function getDataDir() {
  const userData = app.getPath("userData");
  return path.join(userData, "trade-journal-data");
}

function getTradesFilePath() {
  return path.join(getDataDir(), "trades.json");
}

function ensureDataDir() {
  const dir = getDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadTrades(): Trade[] {
  try {
    ensureDataDir();
    const filePath = getTradesFilePath();
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    if (!raw.trim()) return [];
    const parsed = JSON.parse(raw) as Trade[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveTrades(trades: Trade[]) {
  ensureDataDir();
  const filePath = getTradesFilePath();
  fs.writeFileSync(filePath, JSON.stringify(trades, null, 2), "utf-8");
}

export function addTrade(trade: Trade) {
  const trades = loadTrades();
  trades.push(trade);
  saveTrades(trades);
}

/**
 * Filter trades by year + month index (0-based).
 */
export function getTradesForMonth(year: number, monthIndex0: number): Trade[] {
  return loadTrades().filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === monthIndex0;
  });
}
2. IPC wiring in the main process
We will add IPC handlers so the renderer can call:

trades:getAll

trades:add

trades:getForMonth

File: src/main/main.ts
Locate your existing main.ts. You should already have standard
electron-vite boilerplate.

At the top of the file, after other imports, add:

ts
Copy code
import { ipcMain } from "electron";
import {
  loadTrades,
  addTrade as repoAddTrade,
  getTradesForMonth,
  Trade as MainTrade,
} from "./tradeRepo";
Then, inside the place where you set up the app (after app.whenReady().then(...)
or near where the BrowserWindow is created), register IPC handlers once.

If your file already has an app.whenReady().then(() => { ... }), inside that
function block add:

ts
Copy code
  // IPC handlers for trades
  ipcMain.handle("trades:getAll", () => {
    const trades = loadTrades();
    return trades;
  });

  ipcMain.handle(
    "trades:add",
    (_event, trade: MainTrade) => {
      repoAddTrade(trade);
      return { ok: true };
    },
  );

  ipcMain.handle(
    "trades:getForMonth",
    (_event, year: number, monthIndex0: number) => {
      return getTradesForMonth(year, monthIndex0);
    },
  );
Make sure these handlers are registered only once (not inside a function that
runs multiple times).

3. Expose API in preload
File: src/preload/index.ts
We will use contextBridge.exposeInMainWorld to expose a tjApi object
to the renderer.

Replace the contents of src/preload/index.ts with:

ts
Copy code
// src/preload/index.ts
import { contextBridge, ipcRenderer } from "electron";

export type Direction = "Long" | "Short";
export type ReviewStatus = "Reviewed" | "Pending";

export interface Trade {
  id: string;
  date: string;
  symbol: string;
  dir: Direction;
  resultR: number;
  time: string;
  status: ReviewStatus;
}

const tjApi = {
  async getAllTrades(): Promise<Trade[]> {
    return ipcRenderer.invoke("trades:getAll");
  },
  async addTrade(trade: Trade): Promise<void> {
    await ipcRenderer.invoke("trades:add", trade);
  },
  async getTradesForMonth(year: number, monthIndex0: number): Promise<Trade[]> {
    return ipcRenderer.invoke("trades:getForMonth", year, monthIndex0);
  },
};

contextBridge.exposeInMainWorld("tjApi", tjApi);

export type TjApi = typeof tjApi;
4. TypeScript declaration for window.tjApi
File: src/renderer/src/env.d.ts
Extend the Window interface so TypeScript knows about window.tjApi.

Replace the contents of src/renderer/src/env.d.ts with:

ts
Copy code
/// <reference types="vite/client" />

import type { TjApi } from "../../preload";

declare global {
  interface Window {
    tjApi: TjApi;
  }
}

export {};
Adjust the import path if your preload build output path is different,
but with the standard electron-vite template, ../../preload is valid
from src/renderer/src.

5. Renderer-side trade storage helper now calls tjApi
We no longer want to use localStorage for trades in the renderer.

File: src/renderer/src/utils/tradeStorage.ts
Replace the entire file with:

ts
Copy code
// src/renderer/src/utils/tradeStorage.ts
import type { Trade } from "../types";

/**
 * All trade operations are forwarded to the Electron main process
 * via window.tjApi, which persists data to a JSON file under userData.
 */

export async function getTrades(): Promise<Trade[]> {
  if (typeof window === "undefined" || !window.tjApi) return [];
  const trades = await window.tjApi.getAllTrades();
  return trades as Trade[];
}

export async function addTrade(trade: Trade): Promise<void> {
  if (typeof window === "undefined" || !window.tjApi) return;
  await window.tjApi.addTrade(trade);
}

export async function getTradesForMonth(
  year: number,
  monthIndex0: number,
): Promise<Trade[]> {
  if (typeof window === "undefined" || !window.tjApi) return [];
  const trades = await window.tjApi.getTradesForMonth(year, monthIndex0);
  return trades as Trade[];
}
NOTE: these functions are now async.

6. Update Today page to use async helpers
We must adapt TodayPage so it awaits the new async helpers.

File: src/renderer/src/pages/TodayPage.tsx
Replace the entire file with:

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

  const [symbol, setSymbol] = useState("XAUUSD");
  const [dir, setDir] = useState<Direction>("Long");
  const [resultR, setResultR] = useState<string>("1.0");
  const [time, setTime] = useState("09:30");
  const [status, setStatus] = useState<ReviewStatus>("Pending");

  const todayISO = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    (async () => {
      const all = await getTrades();
      setTrades(all);
    })();
  }, []);

  const handleAddTrade = async (e: React.FormEvent) => {
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

    await addTrade(newTrade);
    setTrades((prev) => [...prev, newTrade]);
    setShowModal(false);
  };

  const todaysTrades = trades.filter((t) => t.date === todayISO);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Today</h1>
        <p className="page-subtitle">Today&apos;s trades &amp; review ({todayISO})</p>
      </div>

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
7. Calendar page – use async getTradesForMonth
File: src/renderer/src/pages/CalendarPage.tsx
We now must call the async helper instead of the old local version.

Replace the entire file with:

tsx
Copy code
// src/renderer/src/pages/CalendarPage.tsx
import React, { useEffect, useState } from "react";
import type { Trade } from "../types";
import { getTradesForMonth } from "../utils/tradeStorage";

export const CalendarPage: React.FC = () => {
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth(); // 0-based
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    (async () => {
      const monthTrades = await getTradesForMonth(year, monthIndex);
      setTrades(monthTrades);
    })();
  }, [year, monthIndex]);

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
8. After the agent finishes
The agent must NOT run npm install or npm run dev.

You (the human) can run:

bash
Copy code
npm run dev
Expected behaviour:

Adding trades from the Today page still works.

Restarting the Electron app preserves trades, even if you clear the browser devtools' localStorage, because data now lives in a JSON file under app.getPath("userData").

Calendar continues to show symbol + emoji + R for days that have trades.

End of specification.

yaml
Copy code
