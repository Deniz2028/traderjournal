# Trade Journal – Multi-Timeframe Morning Analysis (MTF v1)

We will extend the existing Trade Journal Electron + React + TS app to support:

- Per-instrument multi-timeframe configuration in **Settings** (e.g. 4H, 15M, 5M).
- For each symbol & timeframe:
  - Separate chart link
  - Separate bias (Long / Neutral / Short)
  - Separate notes
- One **Daily bias** per symbol (e.g. “Daily bias: Long”).
- In **Morning Analysis**:
  - Timeframe tabs at the top (4H / 15M / 5M, etc.).
  - Clicking a tab switches the chart + notes below.
  - First, only a “Paste link” area; after saving, show a large chart preview.
  - Below the chart, a textarea for notes.
  - A compact row showing each timeframe + its bias (e.g. `4H – Long, 15M – Short, 5M – Long`).

**IMPORTANT**

- Do **NOT** modify `package.json`, any `tsconfig.*`, or Electron config files.
- Only create / update the files explicitly listed here.
- When a file is listed with a code block, **replace the entire file contents** with that block.
- Paths are relative to the project root (`trade-journal`).

---

## 1. Extend shared types – add Bias

### File: `src/renderer/src/types.ts`

Append the following at the bottom of the file (keep existing `Trade` etc.):

```ts
// --- Morning analysis shared types ---

export type Bias = "Long" | "Neutral" | "Short";
If the file does not exist for some reason, create it with:

ts
Copy code
// src/renderer/src/types.ts

export type Direction = "Long" | "Short";
export type ReviewStatus = "Reviewed" | "Pending";

export interface Trade {
  id: string;
  date: string; // ISO date string, e.g. "2025-12-10"
  symbol: string;
  dir: Direction;
  resultR: number;
  time: string;
  status: ReviewStatus;
}

// --- Morning analysis shared types ---

export type Bias = "Long" | "Neutral" | "Short";
2. Update settings storage – add per-symbol timeframes
We will extend the existing settingsStorage.ts to also keep
Morning Analysis timeframes per instrument.

File: src/renderer/src/utils/settingsStorage.ts
Replace the entire file with:

ts
Copy code
// src/renderer/src/utils/settingsStorage.ts

export type Timeframe =
  | "4H"
  | "1H"
  | "30M"
  | "15M"
  | "5M"
  | "1M";

export const AVAILABLE_TIMEFRAMES: Timeframe[] = [
  "4H",
  "1H",
  "30M",
  "15M",
  "5M",
  "1M",
];

// ---- Dashboard instruments (existing behaviour) ----

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

// ---- Morning Analysis timeframes per symbol ----

const MORNING_TF_KEY = "tj_morning_timeframes_v1";

export type TimeframeMap = Record<string, Timeframe[]>;

const DEFAULT_TIMEFRAMES: Timeframe[] = ["4H", "15M", "5M"];

export function getMorningTimeframeMap(): TimeframeMap {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(MORNING_TF_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as TimeframeMap;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

export function saveMorningTimeframeMap(map: TimeframeMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MORNING_TF_KEY, JSON.stringify(map));
}

export function getTimeframesForSymbol(symbol: string): Timeframe[] {
  const map = getMorningTimeframeMap();
  const frames = map[symbol];
  if (!frames || frames.length === 0) return DEFAULT_TIMEFRAMES;
  // Filter out invalid entries, keep only known tfs
  return frames.filter((tf) => AVAILABLE_TIMEFRAMES.includes(tf));
}
3. New helper – Morning Analysis storage
We will store today’s morning analysis (per symbol + timeframe)
in localStorage under a dedicated key.

Key: tj_morning_v2

One entry per symbol + date.

Each entry contains:

dailyBias

frames[timeframe] = { chartUrl, bias, notes }

File: src/renderer/src/utils/morningStorage.ts
Create the folder src/renderer/src/utils if it does not exist,
then create this file:

ts
Copy code
// src/renderer/src/utils/morningStorage.ts

import type { Bias } from "../types";

export interface FrameState {
  chartUrl: string;
  bias: Bias;
  notes: string;
}

export interface MorningInstrumentDay {
  symbol: string;
  date: string; // YYYY-MM-DD
  dailyBias: Bias;
  frames: Record<string, FrameState>;
}

interface MorningState {
  [symbol: string]: {
    [date: string]: MorningInstrumentDay;
  };
}

const STORAGE_KEY = "tj_morning_v2";

function loadState(): MorningState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as MorningState;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

function saveState(state: MorningState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadInstrumentDay(
  symbol: string,
  dateISO: string,
  timeframes: string[],
): MorningInstrumentDay {
  const state = loadState();
  const bySymbol = state[symbol] ?? {};
  const existing = bySymbol[dateISO];

  const base: MorningInstrumentDay =
    existing ?? {
      symbol,
      date: dateISO,
      dailyBias: "Neutral",
      frames: {},
    };

  // Ensure all requested timeframes exist
  const frames: Record<string, FrameState> = { ...base.frames };
  for (const tf of timeframes) {
    if (!frames[tf]) {
      frames[tf] = {
        chartUrl: "",
        bias: "Neutral",
        notes: "",
      };
    }
  }

  return {
    ...base,
    frames,
  };
}

export function saveInstrumentDay(day: MorningInstrumentDay) {
  const state = loadState();
  if (!state[day.symbol]) {
    state[day.symbol] = {};
  }
  state[day.symbol][day.date] = day;
  saveState(state);
}
4. Settings page – choose timeframes per symbol
We extend Settings so that:

Top part: same as before (choose dashboard instruments).

Below: for the currently “active” instrument, we can toggle timeframes
(4H, 1H, 30M, 15M, 5M, 1M) for Morning Analysis.

File: src/renderer/src/pages/SettingsPage.tsx
Replace entire file with:

tsx
Copy code
// src/renderer/src/pages/SettingsPage.tsx
import React, { useEffect, useState } from "react";
import {
  ALL_INSTRUMENTS,
  AVAILABLE_TIMEFRAMES,
  getDashboardInstruments,
  getMorningTimeframeMap,
  saveDashboardInstruments,
  saveMorningTimeframeMap,
  type Timeframe,
  type TimeframeMap,
} from "../utils/settingsStorage";

export const SettingsPage: React.FC = () => {
  const [selected, setSelected] = useState<string[]>([]);
  const [tfMap, setTfMap] = useState<TimeframeMap>({});
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);

  useEffect(() => {
    const instruments = getDashboardInstruments();
    setSelected(instruments);

    const map = getMorningTimeframeMap();
    setTfMap(map);

    if (instruments.length > 0) {
      setActiveSymbol(instruments[0]);
    } else {
      setActiveSymbol(ALL_INSTRUMENTS[0] ?? null);
    }
  }, []);

  const toggleInstrument = (symbol: string) => {
    setSelected((prev) => {
      if (prev.includes(symbol)) {
        const next = prev.filter((s) => s !== symbol);
        // If we removed the active symbol, move active to another one
        if (symbol === activeSymbol) {
          setActiveSymbol(next[0] ?? null);
        }
        return next;
      }
      // Add new
      const next = [...prev, symbol];
      if (!activeSymbol) {
        setActiveSymbol(symbol);
      }
      return next;
    });
  };

  const getCurrentTimeframes = (symbol: string | null): Timeframe[] => {
    if (!symbol) return [];
    const list = tfMap[symbol] ?? [];
    if (!Array.isArray(list) || list.length === 0) {
      return ["4H", "15M", "5M"];
    }
    return list;
  };

  const toggleTimeframe = (tf: Timeframe) => {
    if (!activeSymbol) return;

    setTfMap((prev) => {
      const current = prev[activeSymbol] ?? getCurrentTimeframes(activeSymbol);
      const exists = current.includes(tf);
      const next = exists
        ? (current.filter((x) => x !== tf) as Timeframe[])
        : ([...current, tf] as Timeframe[]);

      return {
        ...prev,
        [activeSymbol]: next,
      };
    });
  };

  const handleSave = () => {
    saveDashboardInstruments(selected);
    saveMorningTimeframeMap(tfMap);
    alert("Settings saved.");
  };

  const currentFrames = getCurrentTimeframes(activeSymbol);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">
          Choose dashboard instruments and Morning Analysis timeframes.
        </p>
      </div>

      {/* Dashboard instruments */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>Dashboard instruments</h3>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Select which instruments you want to focus on. These will appear in
          the Dashboard and Morning Analysis.
        </p>

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
                onClick={() => {
                  toggleInstrument(symbol);
                  setActiveSymbol(symbol);
                }}
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
      </div>

      {/* Morning Analysis timeframes */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600 }}>Morning Analysis timeframes</h3>
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          Pick the timeframes you want to use for each instrument (e.g. 4H, 15M, 5M).
          Morning Analysis will show separate chart links and biases for every selected
          timeframe.
        </p>

        <div>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Active instrument:
          </span>{" "}
          <strong>{activeSymbol ?? "None"}</strong>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {AVAILABLE_TIMEFRAMES.map((tf) => {
            const isOn = currentFrames.includes(tf);
            return (
              <button
                key={tf}
                type="button"
                onClick={() => toggleTimeframe(tf)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: isOn
                    ? "1px solid var(--accent-primary)"
                    : "1px solid var(--border-subtle)",
                  backgroundColor: isOn ? "#EEF2FF" : "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {tf}
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
5. Morning Analysis page – MTF UI with daily bias
Now we switch Morning Analysis to:

Use dashboard instruments + per-symbol timeframes from Settings.

For each symbol:

Show Daily bias (Long / Neutral / Short).

Show timeframe tabs (4H, 15M, 5M, etc.).

For the active timeframe:

If no chart yet → show link input + bias selector + “Save”.

After saving → show large chart image.

Under it: notes textarea (per timeframe).

Small summary row: 4H – Long · 15M – Short · 5M – Long.

Clicking the chart opens a full-screen lightbox (Telegram-style).

File: src/renderer/src/pages/MorningAnalysisPage.tsx
Replace the entire file with:

tsx
Copy code
// src/renderer/src/pages/MorningAnalysisPage.tsx
import React, { useMemo, useState } from "react";
import type { Bias } from "../types";
import {
  getDashboardInstruments,
  getTimeframesForSymbol,
} from "../utils/settingsStorage";
import {
  loadInstrumentDay,
  saveInstrumentDay,
  type MorningInstrumentDay,
  type FrameState,
} from "../utils/morningStorage";

type BiasOption = Bias;

const BIAS_OPTIONS: BiasOption[] = ["Long", "Neutral", "Short"];

const biasLabel = (b: Bias): string => b;

const biasColor = (b: Bias): string => {
  switch (b) {
    case "Long":
      return "#16A34A";
    case "Short":
      return "#DC2626";
    default:
      return "#6B7280";
  }
};

// Optional nicer display name per symbol
const SYMBOL_META: Record<
  string,
  { title: string; subtitle: string }
> = {
  DXY: { title: "DXY (Dollar Index)", subtitle: "Dollar strength context" },
  XAUUSD: { title: "XAUUSD (Gold)", subtitle: "Gold bias & key levels" },
  EURUSD: { title: "EURUSD (Euro)", subtitle: "Euro vs USD outlook" },
};

const todayISO = new Date().toISOString().slice(0, 10);

export const MorningAnalysisPage: React.FC = () => {
  const instruments = useMemo(() => getDashboardInstruments(), []);
  const configs = instruments.map((symbol) => {
    const tfs = getTimeframesForSymbol(symbol);
    return {
      symbol,
      timeframes: tfs,
    };
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Morning Analysis</h1>
        <p className="page-subtitle">
          Multi-timeframe chart preview &amp; notes for {todayISO}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {configs.map(({ symbol, timeframes }) => (
          <InstrumentCard
            key={symbol}
            symbol={symbol}
            timeframes={timeframes}
          />
        ))}

        {configs.length === 0 && (
          <div className="card" style={{ padding: 24 }}>
            <p style={{ fontSize: 14 }}>
              No instruments selected. Go to{" "}
              <strong>Settings</strong> and pick some instruments first.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

interface InstrumentCardProps {
  symbol: string;
  timeframes: string[];
}

const InstrumentCard: React.FC<InstrumentCardProps> = ({
  symbol,
  timeframes,
}) => {
  const [day, setDay] = useState<MorningInstrumentDay>(() =>
    loadInstrumentDay(symbol, todayISO, timeframes),
  );

  const [activeTf, setActiveTf] = useState<string>(
    timeframes[0] ?? "4H",
  );

  const [linkDraft, setLinkDraft] = useState<string>("");
  const [tfBiasDraft, setTfBiasDraft] = useState<Bias>("Neutral");

  const [isLightboxOpen, setLightboxOpen] = useState(false);

  const meta = SYMBOL_META[symbol] ?? {
    title: symbol,
    subtitle: "",
  };

  const frames = day.frames;
  const tfList = timeframes.length > 0 ? timeframes : Object.keys(frames);
  const currentFrame: FrameState | undefined = frames[activeTf];

  const ensureFrame = (tf: string): FrameState => {
    if (!day.frames[tf]) {
      const updated: MorningInstrumentDay = {
        ...day,
        frames: {
          ...day.frames,
          [tf]: {
            chartUrl: "",
            bias: "Neutral",
            notes: "",
          },
        },
      };
      saveInstrumentDay(updated);
      setDay(updated);
    }
    return (
      day.frames[tf] ?? {
        chartUrl: "",
        bias: "Neutral",
        notes: "",
      }
    );
  };

  const handleSaveFrame = () => {
    if (!linkDraft.trim()) return;

    const nextFrames = {
      ...day.frames,
      [activeTf]: {
        chartUrl: linkDraft.trim(),
        bias: tfBiasDraft,
        notes: "",
      },
    };
    const updated: MorningInstrumentDay = {
      ...day,
      frames: nextFrames,
    };
    saveInstrumentDay(updated);
    setDay(updated);
    setLinkDraft("");
  };

  const handleUpdateNotes = (notes: string) => {
    const frame = ensureFrame(activeTf);
    const nextFrames = {
      ...day.frames,
      [activeTf]: {
        ...frame,
        notes,
      },
    };
    const updated: MorningInstrumentDay = {
      ...day,
      frames: nextFrames,
    };
    saveInstrumentDay(updated);
    setDay(updated);
  };

  const handleUpdateFrameBias = (bias: Bias) => {
    const frame = ensureFrame(activeTf);
    const nextFrames = {
      ...day.frames,
      [activeTf]: {
        ...frame,
        bias,
      },
    };
    const updated: MorningInstrumentDay = {
      ...day,
      frames: nextFrames,
    };
    saveInstrumentDay(updated);
    setDay(updated);
    setTfBiasDraft(bias);
  };

  const handleUpdateDailyBias = (bias: Bias) => {
    const updated: MorningInstrumentDay = {
      ...day,
      dailyBias: bias,
    };
    saveInstrumentDay(updated);
    setDay(updated);
  };

  const summaryText = tfList
    .map((tf) => {
      const f = frames[tf];
      const b = f?.bias ?? "Neutral";
      return `${tf} – ${b}`;
    })
    .join(" · ");

  // Initialise drafts from current frame when we switch tf
  React.useEffect(() => {
    const f = frames[activeTf];
    if (f) {
      setTfBiasDraft(f.bias);
    } else {
      setTfBiasDraft("Neutral");
    }
    setLinkDraft("");
  }, [activeTf, frames]);

  return (
    <div className="card" style={{ padding: 20 }}>
      {/* Header with title + daily bias */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            {meta.title}
          </div>
          {meta.subtitle && (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              {meta.subtitle}
            </div>
          )}
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              marginTop: 6,
            }}
          >
            Daily bias:{" "}
            <span
              style={{
                fontWeight: 600,
                color: biasColor(day.dailyBias),
              }}
            >
              {biasLabel(day.dailyBias)}
            </span>
          </div>
        </div>

        {/* Daily bias selector */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {BIAS_OPTIONS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => handleUpdateDailyBias(b)}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                fontSize: 12,
                border:
                  day.dailyBias === b
                    ? "1px solid var(--accent-primary)"
                    : "1px solid var(--border-subtle)",
                backgroundColor:
                  day.dailyBias === b ? "#EEF2FF" : "#FFFFFF",
                color: day.dailyBias === b ? biasColor(b) : "#4B5563",
                fontWeight: 500,
              }}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Timeframe tabs */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {tfList.map((tf) => {
          const frame = frames[tf];
          const labelBias = frame?.bias ?? "Neutral";
          const isActive = tf === activeTf;
          return (
            <button
              key={tf}
              type="button"
              onClick={() => setActiveTf(tf)}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: isActive
                  ? "1px solid var(--accent-primary)"
                  : "1px solid var(--border-subtle)",
                backgroundColor: isActive ? "#EFF6FF" : "#FFFFFF",
                fontSize: 12,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontWeight: 600 }}>{tf}</span>
              <span
                style={{
                  fontSize: 11,
                  color: biasColor(labelBias as Bias),
                }}
              >
                {labelBias}
              </span>
            </button>
          );
        })}
      </div>

      {/* Summary row */}
      <div
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          marginBottom: 12,
        }}
      >
        {summaryText}
      </div>

      {/* Main content – link first, then big chart + notes */}
      {currentFrame && currentFrame.chartUrl ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Chart preview */}
          <div
            style={{
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid var(--border-subtle)",
              cursor: "zoom-in",
              maxHeight: 420,
            }}
            onClick={() => setLightboxOpen(true)}
          >
            <img
              src={currentFrame.chartUrl}
              alt={`${symbol} ${activeTf} chart`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>

          {/* Timeframe bias selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              {activeTf} bias:
            </span>
            {BIAS_OPTIONS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => handleUpdateFrameBias(b)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  border:
                    currentFrame.bias === b
                      ? "1px solid var(--accent-primary)"
                      : "1px solid var(--border-subtle)",
                  backgroundColor:
                    currentFrame.bias === b ? "#EEF2FF" : "#FFFFFF",
                  fontSize: 11,
                  color:
                    currentFrame.bias === b ? biasColor(b) : "#4B5563",
                  fontWeight: 500,
                }}
              >
                {b}
              </button>
            ))}
          </div>

          {/* Notes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              Notes / Commentary
            </label>
            <textarea
              value={currentFrame.notes}
              onChange={(e) => handleUpdateNotes(e.target.value)}
              placeholder="Bias, key levels, what you expect today..."
              style={{
                minHeight: 120,
                borderRadius: 8,
                border: "1px solid var(--border-subtle)",
                padding: 10,
                fontSize: 13,
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>

          {/* Change link */}
          <button
            type="button"
            onClick={() => {
              setLinkDraft(currentFrame.chartUrl);
              // Show inline "change link" area by clearing chartUrl is not necessary,
              // we just reuse the input in a small overlay or separate step.
              // For simplicity, open a small prompt-like UI:
              const newUrl = window.prompt(
                "Paste new TradingView snapshot URL (.png):",
                currentFrame.chartUrl,
              );
              if (newUrl) {
                const frame = ensureFrame(activeTf);
                const nextFrames = {
                  ...day.frames,
                  [activeTf]: {
                    ...frame,
                    chartUrl: newUrl.trim(),
                  },
                };
                const updated: MorningInstrumentDay = {
                  ...day,
                  frames: nextFrames,
                };
                saveInstrumentDay(updated);
                setDay(updated);
              }
            }}
            style={{
              alignSelf: "flex-start",
              marginTop: 4,
              fontSize: 11,
              color: "var(--accent-primary)",
            }}
          >
            Change link
          </button>
        </div>
      ) : (
        // No chart yet – show link + bias selector + Save
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: 8,
          }}
        >
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            {activeTf} chart link
          </label>
          <input
            type="text"
            value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)}
            placeholder="Paste TradingView snapshot URL (.png)…"
            style={{
              borderRadius: 8,
              border: "1px solid var(--border-subtle)",
              padding: "8px 10px",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              {activeTf} bias:
            </span>
            {BIAS_OPTIONS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setTfBiasDraft(b)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  border:
                    tfBiasDraft === b
                      ? "1px solid var(--accent-primary)"
                      : "1px solid var(--border-subtle)",
                  backgroundColor:
                    tfBiasDraft === b ? "#EEF2FF" : "#FFFFFF",
                  fontSize: 11,
                  color: tfBiasDraft === b ? biasColor(b) : "#4B5563",
                  fontWeight: 500,
                }}
              >
                {b}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <button
              type="button"
              onClick={handleSaveFrame}
              style={{
                backgroundColor: "var(--accent-primary)",
                color: "#FFFFFF",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                marginTop: 4,
              }}
            >
              Save &amp; show chart
            </button>
          </div>
        </div>
      )}

      {/* Lightbox (full screen chart) */}
      {currentFrame && currentFrame.chartUrl && isLightboxOpen && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              style={{
                position: "absolute",
                top: -32,
                right: 0,
                background: "transparent",
                color: "#FFFFFF",
                fontSize: 18,
              }}
            >
              ×
            </button>
            <img
              src={currentFrame.chartUrl}
              alt={`${symbol} ${activeTf} chart full`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
                borderRadius: 8,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
6. After the agent finishes
The agent must not run npm install or npm run dev.

You (the human) can run:

bash
Copy code
npm run dev
Expected behaviour:

Settings

You still choose your instruments.

For the active instrument, you can toggle timeframes (4H, 1H, 30M, 15M, 5M, 1M).

Settings are saved to localStorage.

Morning Analysis

For each selected instrument:

Shows Daily bias (Long / Neutral / Short).

Shows timeframe chips at the top (e.g. 4H / 15M / 5M).

Summary row: 4H – Long · 15M – Short · 5M – Long.

For a timeframe with no chart yet → only link input + bias buttons + “Save & show chart”.

After saving → big high-quality chart appears, notes box under it.

Clicking the chart opens full-screen lightbox; click background or × to close.

End of specification.