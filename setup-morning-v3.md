 Trade Journal – Morning Analysis v3 Specification

We will redesign the Morning Analysis page UI to behave like a Telegram-style
chart preview:

- Initially: only a small "chart link" input is visible.
- After the user saves a chart link:
  - The input disappears.
  - A large chart preview area appears (image based on the link).
  - A notes / commentary textarea is shown below the chart.
- Data must persist per **date + symbol** using localStorage.

Do NOT modify package.json, Electron config, or other pages.

Only touch the file listed below.

---

## 1. File to update

### File: `src/renderer/src/pages/MorningAnalysisPage.tsx`

Replace the entire contents of this file with the code below.

```tsx
// src/renderer/src/pages/MorningAnalysisPage.tsx
import React, { useEffect, useState } from "react";

type Bias = "bull" | "neutral" | "bear";

interface InstrumentConfig {
  symbol: string;
  title: string;
  subtitle: string;
}

interface InstrumentState {
  chartLink: string;
  notes: string;
  bias: Bias;
}

interface StoredEntry {
  date: string;       // YYYY-MM-DD
  symbol: string;
  chartLink: string;
  notes: string;
  bias: Bias;
}

const STORAGE_KEY = "tj_morning_analysis_v3";

const INSTRUMENTS: InstrumentConfig[] = [
  { symbol: "DXY", title: "DXY (Dollar Index)", subtitle: "Dollar strength context" },
  { symbol: "XAUUSD", title: "XAUUSD (Gold)", subtitle: "Gold bias & key levels" },
  { symbol: "EURUSD", title: "EURUSD (Euro)", subtitle: "Euro vs USD outlook" },
];

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadFromStorage(date: string): Record<string, InstrumentState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const list = JSON.parse(raw) as StoredEntry[];
    const map: Record<string, InstrumentState> = {};
    for (const entry of list) {
      if (entry.date === date) {
        map[entry.symbol] = {
          chartLink: entry.chartLink || "",
          notes: entry.notes || "",
          bias: entry.bias ?? "neutral",
        };
      }
    }
    return map;
  } catch {
    return {};
  }
}

function saveToStorage(date: string, state: Record<string, InstrumentState>) {
  if (typeof window === "undefined") return;

  let list: StoredEntry[] = [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) list = JSON.parse(raw) as StoredEntry[];
  } catch {
    list = [];
  }

  // remove existing entries for this date
  list = list.filter((e) => e.date !== date);

  // push current state for this date
  for (const symbol of Object.keys(state)) {
    const s = state[symbol];
    list.push({
      date,
      symbol,
      chartLink: s.chartLink,
      notes: s.notes,
      bias: s.bias,
    });
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const MorningAnalysisPage: React.FC = () => {
  const todayISO = getTodayISO();
  const [bySymbol, setBySymbol] = useState<Record<string, InstrumentState>>({});

  useEffect(() => {
    setBySymbol(loadFromStorage(todayISO));
  }, [todayISO]);

  const updateInstrument = (symbol: string, patch: Partial<InstrumentState>) => {
    setBySymbol((prev) => {
      const current: InstrumentState =
        prev[symbol] ?? { chartLink: "", notes: "", bias: "neutral" };
      const next: InstrumentState = { ...current, ...patch };
      const newState = { ...prev, [symbol]: next };
      saveToStorage(todayISO, newState);
      return newState;
    });
  };

  const getState = (symbol: string): InstrumentState => {
    return (
      bySymbol[symbol] ?? {
        chartLink: "",
        notes: "",
        bias: "neutral",
      }
    );
  };

  const renderBiasPills = (symbol: string, currentBias: Bias) => {
    const pills: { value: Bias; label: string }[] = [
      { value: "bull", label: "Bull" },
      { value: "neutral", label: "Neutral" },
      { value: "bear", label: "Bear" },
    ];

    return (
      <div style={{ display: "flex", gap: 8 }}>
        {pills.map((pill) => {
          const isActive = pill.value === currentBias;
          return (
            <button
              key={pill.value}
              type="button"
              onClick={() => updateInstrument(symbol, { bias: pill.value })}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 11,
                border: isActive
                  ? "1px solid var(--accent-primary)"
                  : "1px solid var(--border-subtle)",
                backgroundColor: isActive ? "#EFF6FF" : "#FFFFFF",
                color: isActive ? "var(--accent-primary)" : "var(--text-secondary)",
                fontWeight: isActive ? 600 : 500,
              }}
            >
              {pill.label}
            </button>
          );
        })}
      </div>
    );
  };

  const cards = INSTRUMENTS.map((inst) => {
    const state = getState(inst.symbol);
    const hasLink = state.chartLink.trim().length > 0;

    return (
      <div key={inst.symbol} className="card" style={styles.card}>
        {/* Header */}
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.instrumentTitle}>{inst.title}</h3>
            <p style={styles.instrumentSubtitle}>{inst.subtitle}</p>
          </div>
          {renderBiasPills(inst.symbol, state.bias)}
        </div>

        {/* Body: preview + controls */}
        <div style={styles.cardBody}>
          {/* Left: preview area */}
          <div style={styles.previewColumn}>
            {!hasLink && (
              <div style={styles.previewPlaceholder}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  Paste TradingView / snapshot link on the right and click
                  &quot;Show chart&quot; to see the preview here.
                </span>
              </div>
            )}

            {hasLink && (
              <div style={styles.previewBox}>
                {/* Simple image preview – behaves similar to Telegram snapshot */}
                <img
                  src={state.chartLink}
                  alt={`${inst.symbol} chart`}
                  style={styles.previewImage}
                />
              </div>
            )}
          </div>

          {/* Right: input / notes */}
          <div style={styles.controlsColumn}>
            {/* Chart link input – only visible until a link is saved */}
            {!hasLink && (
              <div style={{ marginBottom: 12 }}>
                <label style={styles.label}>Chart link</label>
                <input
                  type="text"
                  placeholder="https://tradingview.com/..."
                  value={state.chartLink}
                  onChange={(e) =>
                    updateInstrument(inst.symbol, { chartLink: e.target.value })
                  }
                  style={styles.input}
                />
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() => {
                    if (!state.chartLink.trim()) return;
                    updateInstrument(inst.symbol, {
                      chartLink: state.chartLink.trim(),
                    });
                  }}
                >
                  Show chart
                </button>
              </div>
            )}

            {hasLink && (
              <div style={{ marginBottom: 12 }}>
                <label style={styles.label}>Chart link</label>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  Link saved.{" "}
                  <button
                    type="button"
                    style={styles.linkButton}
                    onClick={() =>
                      updateInstrument(inst.symbol, { chartLink: "" })
                    }
                  >
                    Change link
                  </button>
                </div>
              </div>
            )}

            {/* Notes textarea – only useful once chart is visible, but we always keep it available */}
            <div>
              <label style={styles.label}>Notes / Commentary</label>
              <textarea
                placeholder="Bias, key levels, what you expect today..."
                value={state.notes}
                onChange={(e) =>
                  updateInstrument(inst.symbol, { notes: e.target.value })
                }
                rows={hasLink ? 6 : 4}
                style={styles.textarea}
              />
            </div>
          </div>
        </div>
      </div>
    );
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Morning Analysis</h1>
        <p className="page-subtitle">
          DXY, Gold, EUR • chart preview &amp; notes for {todayISO}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {cards}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  instrumentTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 4,
  },
  instrumentSubtitle: {
    fontSize: 12,
    color: "var(--text-secondary)",
  },
  cardBody: {
    display: "grid",
    gridTemplateColumns: "minmax(260px, 3fr) minmax(260px, 2fr)",
    gap: 16,
  },
  previewColumn: {
    minHeight: 220,
  },
  previewPlaceholder: {
    height: "100%",
    borderRadius: 12,
    border: "1px dashed var(--border-subtle)",
    backgroundColor: "#F9FAFB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    textAlign: "center",
  },
  previewBox: {
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid var(--border-subtle)",
    backgroundColor: "#000000",
  },
  previewImage: {
    width: "100%",
    display: "block",
    maxHeight: 360,
    objectFit: "cover",
  },
  controlsColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  label: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 4,
    color: "var(--text-secondary)",
  },
  input: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid var(--border-subtle)",
    fontSize: 13,
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: "var(--accent-primary)",
    color: "#FFFFFF",
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 13,
    fontWeight: 500,
  },
  linkButton: {
    background: "none",
    border: "none",
    padding: 0,
    margin: 0,
    color: "var(--accent-primary)",
    cursor: "pointer",
    textDecoration: "underline",
    fontSize: 12,
  },
  textarea: {
    width: "100%",
    borderRadius: 8,
    border: "1px solid var(--border-subtle)",
    padding: "8px 10px",
    fontSize: 13,
    resize: "vertical",
  },
};
2. After the agent finishes
The agent must NOT run npm install or npm run dev.

You can keep npm run dev running or start it manually.

Expected behaviour on Morning Analysis:

Her enstrüman için:

Başta sadece link inputu + “Show chart” butonu var.

Link kaydedince input kayboluyor, kartın sol tarafında büyük chart resmi çıkıyor.

Resmin sağında / altında Notes / Commentary alanı var.

Bias (Bull / Neutral / Bear) butonları çalışıyor ve state’i koruyor.

Her şey tarih + sembol bazlı kaydediliyor, uygulamayı kapatıp açınca kaybolmuyor.

End of specification.