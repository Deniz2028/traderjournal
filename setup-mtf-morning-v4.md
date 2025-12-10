# Trade Journal – MTF Morning Analysis v4

Amaç:

- Morning Analysis’i **çoklu timeframe** (4H / 15M / 5M vb.) destekleyecek hale getirmek.
- Hangi enstrüman için hangi timeframelerin kullanılacağını **Settings** ekranından seçebilmek.
- Morning verisini backend’de yeni bir şema ile saklayıp,
  - Morning sayfasından okuyup yazmak,
  - Calendar’da ilgili güne “Morning analysis” etiketi eklemek ve tıklayınca o günü açmak.

Bu dosyadaki adımları sırayla uygula.  
Aksi belirtilmedikçe Electron / Vite / React config dosyalarına dokunma.

---

## 0. Genel Tasarım

Yeni kavramlar:

- **Bias**: `"long" | "short" | "neutral"`
- **Timeframe**: `"4H" | "1H" | "15M" | "5M" | "1M"` (gerekirse kolayca genişletilebilir)
- Bir günün sabah analizi:

```ts
date: "2025-12-10"

instruments: [
  {
    symbol: "XAUUSD",
    dailyBias: "long",
    timeframes: [
      { tf: "4H", chartUrl: "...png", bias: "long", notes: "HTF liquidity grab" },
      { tf: "15M", chartUrl: "...png", bias: "short", notes: "intra-day pullback" },
      { tf: "5M", chartUrl: "...png", bias: "long", notes: "scalp continuation" },
    ],
  },
  ...
]
Bu yapı ayrı bir JSON dosyada (morning_mtf.json) saklanacak ve
IPC üzerinden morningMtf:* kanallarıyla okunup yazılacak.

1. Shared Types – morningMtfTypes.ts
File: src/shared/morningMtfTypes.ts
Bu dosya yoksa oluştur, varsa tamamen aşağıdakiyle değiştir:

ts
Copy code
// src/shared/morningMtfTypes.ts

export type MorningMtfBias = "long" | "short" | "neutral";

// Sadece ihtiyaç duydukça genişlet
export type MorningMtfTimeframeId = "4H" | "1H" | "15M" | "5M" | "1M";

export interface MorningMtfTimeframeSnapshot {
  tf: MorningMtfTimeframeId;
  chartUrl: string;
  bias: MorningMtfBias;
  notes: string;
}

export interface MorningMtfInstrumentSnapshot {
  symbol: string; // Örn: "XAUUSD"
  dailyBias: MorningMtfBias;
  timeframes: MorningMtfTimeframeSnapshot[];
}

export interface MorningMtfDaySnapshot {
  date: string; // YYYY-MM-DD
  instruments: MorningMtfInstrumentSnapshot[];
}
2. Backend Store – morningMtfStore.ts
File: src/main/morningMtfStore.ts
Yeni backend store’u oluştur:

ts
Copy code
// src/main/morningMtfStore.ts
import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { MorningMtfDaySnapshot } from "../shared/morningMtfTypes";

interface MorningMtfStoreFile {
  [date: string]: MorningMtfDaySnapshot;
}

function getFilePath() {
  const userData = app.getPath("userData");
  return path.join(userData, "morning_mtf.json");
}

function readStore(): MorningMtfStoreFile {
  try {
    const filePath = getFilePath();
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, "utf-8");
    if (!raw.trim()) return {};
    return JSON.parse(raw) as MorningMtfStoreFile;
  } catch {
    return {};
  }
}

function writeStore(store: MorningMtfStoreFile) {
  const filePath = getFilePath();
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2), "utf-8");
}

export function getMorningMtfForDate(
  date: string,
): MorningMtfDaySnapshot | null {
  const store = readStore();
  return store[date] ?? null;
}

export function saveMorningMtfForDate(snapshot: MorningMtfDaySnapshot): void {
  const store = readStore();
  store[snapshot.date] = snapshot;
  writeStore(store);
}

export function getMorningMtfForMonth(
  year: number,
  month: number, // 1-12
): MorningMtfDaySnapshot[] {
  const store = readStore();
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  return Object.values(store).filter((s) => s.date.startsWith(prefix));
}
3. Main Process – IPC Handlers
File: src/main/index.ts
Bu dosyayı tamamen değiştirme.
Aşağıdaki PATCH’i uygula:

Diğer import’ların yanına ekle:

ts
Copy code
import {
  getMorningMtfForDate,
  saveMorningMtfForDate,
  getMorningMtfForMonth,
} from "./morningMtfStore";
import type { MorningMtfDaySnapshot } from "../shared/morningMtfTypes";
Zaten ipcMain.handle(...) kullandığın yere (trade backend handlerlarının yanına) şu üç handler’ı ekle:

ts
Copy code
import { ipcMain } from "electron";

// ...

ipcMain.handle("morningMtf:getForDate", async (_event, date: string) => {
  return getMorningMtfForDate(date);
});

ipcMain.handle(
  "morningMtf:saveForDate",
  async (_event, snapshot: MorningMtfDaySnapshot) => {
    saveMorningMtfForDate(snapshot);
  },
);

ipcMain.handle(
  "morningMtf:getForMonth",
  async (_event, year: number, month: number) => {
    return getMorningMtfForMonth(year, month);
  },
);
Not: Handler’ların, mevcut trade handlerlarının olduğu yerde (app ready olduktan sonra) tanımlandığından emin ol.

4. Preload Köprüsü
File: src/preload/index.ts
Bu dosyada halihazırda trades için bir köprü var.
Aşağıdaki gibi genişlet:

ts
Copy code
// src/preload/index.ts
import { contextBridge, ipcRenderer } from "electron";

const api = {
  // Zaten varsa, mevcut trades API'nı koru
  trades: {
    // örnek:
    // getAll: () => ipcRenderer.invoke("trades:getAll"),
    // ...
  },

  morningMtf: {
    getForDate: (date: string) =>
      ipcRenderer.invoke("morningMtf:getForDate", date),
    saveForDate: (snapshot: unknown) =>
      ipcRenderer.invoke("morningMtf:saveForDate", snapshot),
    getForMonth: (year: number, month: number) =>
      ipcRenderer.invoke("morningMtf:getForMonth", year, month),
  },
};

contextBridge.exposeInMainWorld("api", api);
Önemli: trades kısmındaki fonksiyonları silme; sadece morningMtf nesnesini ekle.

File: src/renderer/src/preload-api.ts
TypeScript tarafında window.api tipini güncelle:

ts
Copy code
// src/renderer/src/preload-api.ts
import type {
  MorningMtfDaySnapshot,
} from "../../shared/morningMtfTypes";

export interface MorningMtfApi {
  getForDate(date: string): Promise<MorningMtfDaySnapshot | null>;
  saveForDate(snapshot: MorningMtfDaySnapshot): Promise<void>;
  getForMonth(year: number, month: number): Promise<MorningMtfDaySnapshot[]>;
}

export interface Api {
  trades: {
    // mevcut trade methodların (getAll, add, vs) burada tanımlı kalsın
    // örnek:
    // getForMonth(year: number, month: number): Promise<...>;
  };
  morningMtf: MorningMtfApi;
}

declare global {
  interface Window {
    api: Api;
  }
}
5. Morning Settings – Hangi Coin Hangi TF?
5.1 Storage
File: src/renderer/src/utils/morningMtfSettings.ts
ts
Copy code
// src/renderer/src/utils/morningMtfSettings.ts
import { ALL_INSTRUMENTS } from "./settingsStorage"; // daha önce tanımladığımız liste
import type { MorningMtfTimeframeId } from "../../../shared/morningMtfTypes";

const STORAGE_KEY = "tj_morning_mtf_settings_v1";

export type MorningMtfSettings = {
  [symbol: string]: MorningMtfTimeframeId[];
};

const DEFAULT_TFS: MorningMtfTimeframeId[] = ["4H", "15M", "5M"];

export const AVAILABLE_TFS: MorningMtfTimeframeId[] = [
  "4H",
  "1H",
  "15M",
  "5M",
  "1M",
];

export function loadMorningMtfSettings(): MorningMtfSettings {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as MorningMtfSettings;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function saveMorningMtfSettings(settings: MorningMtfSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getTimeframesForSymbol(
  symbol: string,
  settings: MorningMtfSettings,
): MorningMtfTimeframeId[] {
  if (settings[symbol] && settings[symbol]!.length > 0) {
    return settings[symbol]!;
  }
  // Varsayılan: 3 TF
  return DEFAULT_TFS;
}

export function getAllTrackedSymbols(settings: MorningMtfSettings): string[] {
  const fromSettings = Object.keys(settings);
  return Array.from(
    new Set([...ALL_INSTRUMENTS, ...fromSettings]),
  ).sort();
}
5.2 Settings UI
File: src/renderer/src/pages/SettingsPage.tsx
Bu dosyayı tamamen aşağıdaki ile değiştir:

tsx
Copy code
// src/renderer/src/pages/SettingsPage.tsx
import React, { useEffect, useState } from "react";
import {
  ALL_INSTRUMENTS,
  getDashboardInstruments,
  saveDashboardInstruments,
} from "../utils/settingsStorage";
import {
  AVAILABLE_TFS,
  loadMorningMtfSettings,
  saveMorningMtfSettings,
  type MorningMtfSettings,
  getTimeframesForSymbol,
} from "../utils/morningMtfSettings";

const SettingsPage: React.FC = () => {
  const [dashboardSymbols, setDashboardSymbols] = useState<string[]>([]);
  const [mtfSettings, setMtfSettings] = useState<MorningMtfSettings>({});

  useEffect(() => {
    setDashboardSymbols(getDashboardInstruments());
    setMtfSettings(loadMorningMtfSettings());
  }, []);

  const toggleDashboardSymbol = (symbol: string) => {
    setDashboardSymbols((prev) =>
      prev.includes(symbol)
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol],
    );
  };

  const toggleTimeframe = (symbol: string, tf: (typeof AVAILABLE_TFS)[number]) => {
    setMtfSettings((prev) => {
      const current = getTimeframesForSymbol(symbol, prev);
      const exists = current.includes(tf);
      let next = current;

      if (exists) {
        next = current.filter((t) => t !== tf);
      } else {
        if (current.length >= 3) {
          // En fazla 3 TF
          next = [...current.slice(1), tf];
        } else {
          next = [...current, tf];
        }
      }

      return {
        ...prev,
        [symbol]: next,
      };
    });
  };

  const handleSave = () => {
    saveDashboardInstruments(dashboardSymbols);
    saveMorningMtfSettings(mtfSettings);
    alert("Settings saved.");
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">
          Configure dashboard focus instruments and Morning Analysis timeframes.
        </p>
      </div>

      {/* Dashboard instruments */}
      <div className="card" style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>Dashboard instruments</h3>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Select which instruments you want to see in the “Today&apos;s focus” area.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 8,
          }}
        >
          {ALL_INSTRUMENTS.map((symbol) => {
            const active = dashboardSymbols.includes(symbol);
            return (
              <button
                key={symbol}
                type="button"
                onClick={() => toggleDashboardSymbol(symbol)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: active
                    ? "1px solid var(--accent-primary)"
                    : "1px solid var(--border-subtle)",
                  backgroundColor: active ? "#EFF6FF" : "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {symbol}
              </button>
            );
          })}
        </div>
      </div>

      {/* Morning MTF settings */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600 }}>Morning Analysis – MTF setup</h3>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          For each instrument, pick up to three timeframes you want to analyse in the morning
          (for example 4H, 15M, 5M). These will appear as tabs on the Morning Analysis page.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ALL_INSTRUMENTS.map((symbol) => {
            const tfs = getTimeframesForSymbol(symbol, mtfSettings);

            return (
              <div
                key={symbol}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: 8,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>{symbol}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {AVAILABLE_TFS.map((tf) => {
                    const active = tfs.includes(tf);
                    return (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => toggleTimeframe(symbol, tf)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          border: active
                            ? "1px solid var(--accent-primary)"
                            : "1px solid var(--border-subtle)",
                          backgroundColor: active ? "#EEF2FF" : "#FFFFFF",
                        }}
                      >
                        {tf}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
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
            Save all settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
6. Morning Analysis Page – MTF UI + Backend
File: src/renderer/src/utils/morningMtfClient.ts
ts
Copy code
// src/renderer/src/utils/morningMtfClient.ts
import type { MorningMtfDaySnapshot } from "../../../shared/morningMtfTypes";
import type { MorningMtfApi } from "../preload-api";

function getApi(): MorningMtfApi {
  // @ts-expect-error - global injected by preload
  return window.api.morningMtf;
}

export function fetchMorningForDate(date: string) {
  return getApi().getForDate(date);
}

export function saveMorningForDate(snapshot: MorningMtfDaySnapshot) {
  return getApi().saveForDate(snapshot);
}

export function fetchMorningForMonth(year: number, month: number) {
  return getApi().getForMonth(year, month);
}
File: src/renderer/src/pages/MorningAnalysisPage.tsx
Bu dosyayı tamamen değiştir:

tsx
Copy code
// src/renderer/src/pages/MorningAnalysisPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import type {
  MorningMtfBias,
  MorningMtfDaySnapshot,
  MorningMtfInstrumentSnapshot,
  MorningMtfTimeframeId,
  MorningMtfTimeframeSnapshot,
} from "../../../shared/morningMtfTypes";
import {
  loadMorningMtfSettings,
  getTimeframesForSymbol,
} from "../utils/morningMtfSettings";
import {
  fetchMorningForDate,
  saveMorningForDate,
} from "../utils/morningMtfClient";

type Bias = MorningMtfBias;
type TF = MorningMtfTimeframeId;

// Şimdilik 3 sabit enstrüman – istersen Settings'teki seçime göre genişletilebilir
const INSTRUMENTS = [
  { symbol: "DXY", title: "DXY (Dollar Index)", subtitle: "Dollar strength context" },
  { symbol: "XAUUSD", title: "XAUUSD (Gold)", subtitle: "Gold bias & key levels" },
  { symbol: "EURUSD", title: "EURUSD (Euro)", subtitle: "Euro vs USD outlook" },
];

const biasLabel: Record<Bias, string> = {
  long: "Long",
  short: "Short",
  neutral: "Neutral",
};

const biasColor: Record<Bias, string> = {
  long: "#16A34A",
  short: "#DC2626",
  neutral: "#6B7280",
};

const MorningAnalysisPage: React.FC = () => {
  const todayISO = new Date().toISOString().slice(0, 10);
  const [snapshot, setSnapshot] = useState<MorningMtfDaySnapshot | null>(null);
  const [activeTfBySymbol, setActiveTfBySymbol] = useState<Record<string, TF>>({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Settings'ten TF konfigurasyonu
  const mtfSettings = useMemo(() => loadMorningMtfSettings(), []);

  useEffect(() => {
    fetchMorningForDate(todayISO).then((existing) => {
      if (existing) {
        setSnapshot(existing);
      } else {
        // boilerplate snapshot
        const instruments: MorningMtfInstrumentSnapshot[] = INSTRUMENTS.map(
          ({ symbol }) => {
            const tfs = getTimeframesForSymbol(symbol, mtfSettings);
            const timeframes: MorningMtfTimeframeSnapshot[] = tfs.map((tf) => ({
              tf,
              chartUrl: "",
              bias: "neutral",
              notes: "",
            }));
            return {
              symbol,
              dailyBias: "neutral",
              timeframes,
            };
          },
        );
        setSnapshot({ date: todayISO, instruments });
      }
      setSettingsLoaded(true);
    });
  }, [todayISO, mtfSettings]);

  // Aktif tab – default: ilk TF
  useEffect(() => {
    if (!snapshot) return;
    const mapping: Record<string, TF> = {};
    snapshot.instruments.forEach((inst) => {
      mapping[inst.symbol] = inst.timeframes[0]?.tf ?? "4H";
    });
    setActiveTfBySymbol(mapping);
  }, [snapshot]);

  if (!settingsLoaded || !snapshot) {
    return <div>Loading morning analysis...</div>;
  }

  const updateInstrument = (
    symbol: string,
    updater: (inst: MorningMtfInstrumentSnapshot) => MorningMtfInstrumentSnapshot,
  ) => {
    setSnapshot((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        instruments: prev.instruments.map((inst) =>
          inst.symbol === symbol ? updater(inst) : inst,
        ),
      };
    });
  };

  const handleSaveAll = async () => {
    if (!snapshot) return;
    await saveMorningForDate(snapshot);
    alert("Morning analysis saved.");
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Morning Analysis</h1>
        <p className="page-subtitle">
          DXY, Gold, EUR • multi-timeframe snapshot for {todayISO}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {snapshot.instruments.map((inst) => {
          const tfs = inst.timeframes;
          const activeTf = activeTfBySymbol[inst.symbol] ?? tfs[0]?.tf;
          const active = tfs.find((tf) => tf.tf === activeTf) ?? tfs[0];

          if (!active) return null;

          const onChangeDailyBias = (bias: Bias) => {
            updateInstrument(inst.symbol, (cur) => ({ ...cur, dailyBias: bias }));
          };

          const onChangeChartUrl = (tf: TF, val: string) => {
            updateInstrument(inst.symbol, (cur) => ({
              ...cur,
              timeframes: cur.timeframes.map((t) =>
                t.tf === tf ? { ...t, chartUrl: val } : t,
              ),
            }));
          };

          const onChangeTfBias = (tf: TF, bias: Bias) => {
            updateInstrument(inst.symbol, (cur) => ({
              ...cur,
              timeframes: cur.timeframes.map((t) =>
                t.tf === tf ? { ...t, bias } : t,
              ),
            }));
          };

          const onChangeNotes = (tf: TF, val: string) => {
            updateInstrument(inst.symbol, (cur) => ({
              ...cur,
              timeframes: cur.timeframes.map((t) =>
                t.tf === tf ? { ...t, notes: val } : t,
              ),
            }));
          };

          return (
            <div key={inst.symbol} className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600 }}>{inst.symbol}</h2>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {
                      INSTRUMENTS.find((i) => i.symbol === inst.symbol)?.subtitle ??
                      "Morning outlook"
                    }
                  </p>
                </div>

                {/* Daily Bias seçimi */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
                    Daily bias
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: biasColor[inst.dailyBias] }}>
                    {biasLabel[inst.dailyBias].toUpperCase()}
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    {(["long", "neutral", "short"] as Bias[]).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => onChangeDailyBias(b)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          border:
                            inst.dailyBias === b
                              ? "1px solid var(--accent-primary)"
                              : "1px solid var(--border-subtle)",
                          backgroundColor:
                            inst.dailyBias === b ? "#EEF2FF" : "#FFFFFF",
                        }}
                      >
                        {biasLabel[b]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timeframe tabs */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: 8,
                }}
              >
                {tfs.map((tf) => {
                  const isActive = tf.tf === active.tf;
                  return (
                    <button
                      key={tf.tf}
                      type="button"
                      onClick={() =>
                        setActiveTfBySymbol((prev) => ({
                          ...prev,
                          [inst.symbol]: tf.tf,
                        }))
                      }
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        fontSize: 12,
                        border: isActive
                          ? "1px solid var(--accent-primary)"
                          : "1px solid var(--border-subtle)",
                        backgroundColor: isActive ? "#EEF2FF" : "#FFFFFF",
                      }}
                    >
                      {tf.tf} · {biasLabel[tf.bias]}
                    </button>
                  );
                })}
              </div>

              {/* Link input + image preview */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  {active.tf} chart link
                </div>
                <input
                  placeholder="Paste TradingView snapshot URL (.png)"
                  value={active.chartUrl}
                  onChange={(e) => onChangeChartUrl(active.tf, e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--border-subtle)",
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                />

                {/* Preview */}
                {active.chartUrl && (
                  <div
                    style={{
                      borderRadius: 12,
                      overflow: "hidden",
                      border: "1px solid #E5E7EB",
                    }}
                  >
                    <img
                      src={active.chartUrl}
                      alt={`${inst.symbol} ${active.tf} chart`}
                      style={{
                        width: "100%",
                        maxHeight: 400,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Bias + notes */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>Bias for this TF</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {(["long", "neutral", "short"] as Bias[]).map((b) => {
                    const isActive = active.bias === b;
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => onChangeTfBias(active.tf, b)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          border: isActive
                            ? "1px solid var(--accent-primary)"
                            : "1px solid var(--border-subtle)",
                          backgroundColor: isActive ? "#EEF2FF" : "#FFFFFF",
                        }}
                      >
                        {biasLabel[b]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  Notes / commentary ({active.tf})
                </div>
                <textarea
                  placeholder="Bias, key levels, what you expect today..."
                  value={active.notes}
                  onChange={(e) => onChangeNotes(active.tf, e.target.value)}
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid var(--border-subtle)",
                    resize: "vertical",
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={handleSaveAll}
          style={{
            backgroundColor: "var(--accent-primary)",
            color: "#FFFFFF",
            padding: "8px 18px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Save morning snapshot
        </button>
      </div>
    </div>
  );
};

export default MorningAnalysisPage;
7. Calendar – Morning Snapshot Etiketi
File: src/renderer/src/pages/CalendarPage.tsx
Bu dosyada zaten trade sonuçlarını gösteren bir grid var.
Aşağıdaki gibi Morning etiketini ekleyecek şekilde güncelle:

Not: Burada trade tarafındaki mevcut hesaplamanı koru; sadece ek state ve “Morning analysis” pill’ini ekliyoruz.

tsx
Copy code
// src/renderer/src/pages/CalendarPage.tsx
import React, { useEffect, useState } from "react";
import { fetchMorningForMonth } from "../utils/morningMtfClient";
import type { MorningMtfDaySnapshot } from "../../../shared/morningMtfTypes";

// Eğer trades için bir helper kullanıyorsan, onu import etmeye devam et
// import { fetchTradesForMonth } from "../utils/tradeClient";

const CalendarPage: React.FC = () => {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [monthIndex, setMonthIndex] = useState(() => new Date().getMonth()); // 0-11
  const [morningByDate, setMorningByDate] = useState<Record<string, MorningMtfDaySnapshot>>({});
  const [morningModalDate, setMorningModalDate] = useState<string | null>(null);

  const month = monthIndex + 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  useEffect(() => {
    fetchMorningForMonth(year, month).then((list) => {
      const map: Record<string, MorningMtfDaySnapshot> = {};
      list.forEach((snap) => {
        map[snap.date] = snap;
      });
      setMorningByDate(map);
    });
  }, [year, month]);

  const changeMonth = (delta: number) => {
    setMonthIndex((prev) => {
      const next = prev + delta;
      if (next < 0) {
        setYear((y) => y - 1);
        return 11;
      }
      if (next > 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return next;
    });
  };

  const dayBoxes = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateISO = new Date(year, monthIndex, day).toISOString().slice(0, 10);
    const morning = morningByDate[dateISO];

    dayBoxes.push(
      <div key={day} style={styles.dayBox}>
        <span style={styles.dayNumber}>{day}</span>

        {/* Buraya mevcut PnL / R özetini koymaya devam et (varsa) */}

        {morning && (
          <button
            type="button"
            onClick={() => setMorningModalDate(dateISO)}
            style={styles.morningPill}
          >
            Morning analysis
          </button>
        )}
      </div>,
    );
  }

  const activeMorning =
    morningModalDate != null ? morningByDate[morningModalDate] : null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Calendar</h1>
        <p className="page-subtitle">
          Daily performance overview ({year}-{String(month).padStart(2, "0")})
        </p>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div style={styles.navRow}>
          <button type="button" onClick={() => changeMonth(-1)} style={styles.navBtn}>
            ← Prev
          </button>
          <div style={{ fontWeight: 600 }}>
            {new Date(year, monthIndex).toLocaleString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </div>
          <button type="button" onClick={() => changeMonth(1)} style={styles.navBtn}>
            Next →
          </button>
        </div>

        <div style={styles.grid}>{dayBoxes}</div>
      </div>

      {/* Morning modal */}
      {activeMorning && (
        <div style={styles.modalOverlay} onClick={() => setMorningModalDate(null)}>
          <div
            className="card"
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 8 }}>
              Morning analysis – {activeMorning.date}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activeMorning.instruments.map((inst) => (
                <div
                  key={inst.symbol}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    paddingBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{inst.symbol}</span>
                    <span style={{ fontSize: 12 }}>
                      Daily bias: {inst.dailyBias.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {inst.timeframes
                      .map((tf) => `${tf.tf}: ${tf.bias.toUpperCase()}`)
                      .join(" · ")}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setMorningModalDate(null)}
                style={styles.closeBtn}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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
    gap: 6,
  },
  dayNumber: {
    fontSize: 12,
    fontWeight: 600,
    color: "#9CA3AF",
  },
  morningPill: {
    alignSelf: "flex-start",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    border: "1px solid var(--accent-primary)",
    backgroundColor: "#EEF2FF",
  },
  navRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  navBtn: {
    padding: "4px 10px",
    borderRadius: 8,
    fontSize: 12,
    border: "1px solid var(--border-subtle)",
    backgroundColor: "#F9FAFB",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  modalContent: {
    width: 420,
    maxHeight: "80vh",
    overflow: "auto",
  },
  closeBtn: {
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 12,
    backgroundColor: "var(--accent-primary)",
    color: "#fff",
  },
};

export default CalendarPage;
8. Son
Bu adımlar tamamlandığında:

Settings’ten her enstrüman için max 3 TF seçebileceksin.

Morning Analysis sayfasında:

Her enstrümanın üstünde Daily bias (LONG/SHORT/NEUTRAL) büyük yazacak.

Altında seçtiğin timeframeler arasında sekmelerle (4H, 15M, 5M…) gezebileceksin.

Her TF için ayrı chart linki, bias ve not tutabileceksin.

Morning snapshot’lar morning_mtf.json dosyasında saklanacak.

Calendar’da, sabah analizi olan günlerde “Morning analysis” etiketi çıkacak; tıklayınca o güne ait bias özetini modalda göreceksin.