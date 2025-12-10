# Trade Journal – Morning Analysis v2 & Small UI Tweaks

This spec updates the existing Electron + Vite + React Trade Journal app.

## Global instructions

1. Read this file completely before making changes.
2. Do NOT touch `package.json`, `electron.vite.config.ts` or the Electron main/preload code.
3. Keep the existing data model for trades and calendar as created in `setup-veri.md` and `setup-features-01.md`.
4. When updating files, preserve all existing imports that are still used.
5. If a component already consumes global stores/hooks for trades, **keep that logic**; only adjust layout & UI as described.

---

## 1. New Hook – Morning Analysis State

Create a new hook to store morning analysis per day and instrument.

**File:** `src/renderer/src/hooks/useMorningAnalysis.ts`

```ts
import { useEffect, useState } from 'react';

export type Bias = 'bull' | 'neutral' | 'bear';

export interface MorningAnalysisEntry {
  symbol: string;            // e.g. "DXY", "XAUUSD", "EURUSD"
  date: string;              // ISO date "YYYY-MM-DD"
  chartLink: string;
  notes: string;
  bias: Bias;
}

interface UseMorningAnalysisResult {
  entries: MorningAnalysisEntry[];
  getEntry: (symbol: string, date: string) => MorningAnalysisEntry | undefined;
  upsertEntry: (entry: MorningAnalysisEntry) => void;
}

const STORAGE_KEY = 'trade_journal_morning_analysis_v1';

export function useMorningAnalysis(currentDateISO: string): UseMorningAnalysisResult {
  const [entries, setEntries] = useState<MorningAnalysisEntry[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as MorningAnalysisEntry[];
      setEntries(parsed);
    } catch (e) {
      console.error('Failed to load morning analysis from storage', e);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.error('Failed to save morning analysis to storage', e);
    }
  }, [entries]);

  const getEntry = (symbol: string, date: string): MorningAnalysisEntry | undefined =>
    entries.find(e => e.symbol === symbol && e.date === date);

  const upsertEntry = (entry: MorningAnalysisEntry) => {
    setEntries(prev => {
      const idx = prev.findIndex(
        e => e.symbol === entry.symbol && e.date === entry.date
      );
      if (idx === -1) return [...prev, entry];
      const copy = [...prev];
      copy[idx] = entry;
      return copy;
    });
  };

  return { entries, getEntry, upsertEntry };
}
2. Morning Analysis Page – New Horizontal Layout
The new layout:

Page still called Morning Analysis.

For each instrument (DXY, XAUUSD, EURUSD for now):

A full-width row card.

Left side: big “chart preview” area.

If chartLink is a TradingView snapshot URL (or any image URL), show the image.

Otherwise show a light gray placeholder with the text “Paste chart link to see preview”.

Right side: controls stacked vertically:

Instrument name (e.g. “XAUUSD (Gold)”).

Bias buttons: Bull / Neutral / Bear.

Input: “Chart link”.

Textarea: “Notes / Commentary”.

Data is saved automatically via useMorningAnalysis hook with date = today.

Replace the current Morning Analysis component with this implementation.

File: src/renderer/src/pages/MorningAnalysisPage.tsx

tsx
Copy code
import React from 'react';
import { useMorningAnalysis, Bias } from '../hooks/useMorningAnalysis';

const INSTRUMENTS = [
  { symbol: 'DXY', label: 'DXY (Dollar Index)' },
  { symbol: 'XAUUSD', label: 'XAUUSD (Gold)' },
  { symbol: 'EURUSD', label: 'EURUSD (Euro)' },
];

const todayISO = new Date().toISOString().slice(0, 10);

const biasLabel: Record<Bias, string> = {
  bull: 'Bull',
  neutral: 'Neutral',
  bear: 'Bear',
};

export const MorningAnalysisPage: React.FC = () => {
  const { getEntry, upsertEntry } = useMorningAnalysis(todayISO);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Morning Analysis</h1>
        <p className="page-subtitle">
          DXY, Gold, EUR • chart preview & notes for {todayISO}
        </p>
      </div>

      <div style={styles.column}>
        {INSTRUMENTS.map((inst) => {
          const existing = getEntry(inst.symbol, todayISO);
          const chartLink = existing?.chartLink ?? '';
          const notes = existing?.notes ?? '';
          const bias = existing?.bias ?? 'neutral';

          const handleBiasChange = (newBias: Bias) => {
            upsertEntry({
              symbol: inst.symbol,
              date: todayISO,
              chartLink,
              notes,
              bias: newBias,
            });
          };

          const handleChartChange: React.ChangeEventHandler<HTMLInputElement> = (
            e,
          ) => {
            upsertEntry({
              symbol: inst.symbol,
              date: todayISO,
              chartLink: e.target.value,
              notes,
              bias,
            });
          };

          const handleNotesChange: React.ChangeEventHandler<HTMLTextAreaElement> =
            (e) => {
              upsertEntry({
                symbol: inst.symbol,
                date: todayISO,
                chartLink,
                notes: e.target.value,
                bias,
              });
            };

          const showImage =
            chartLink.startsWith('http://') || chartLink.startsWith('https://');

          return (
            <div key={inst.symbol} className="card" style={styles.rowCard}>
              {/* LEFT: Chart preview */}
              <div style={styles.chartPreview}>
                {showImage ? (
                  <img
                    src={chartLink}
                    alt={`${inst.symbol} chart`}
                    style={styles.chartImage}
                  />
                ) : (
                  <div style={styles.chartPlaceholder}>
                    <span style={styles.chartPlaceholderText}>
                      Paste chart link to see preview
                    </span>
                  </div>
                )}
              </div>

              {/* RIGHT: Controls */}
              <div style={styles.controls}>
                <div style={styles.headerRow}>
                  <span style={styles.instrumentTitle}>{inst.label}</span>
                  <div style={styles.biasGroup}>
                    {(['bull', 'neutral', 'bear'] as Bias[]).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => handleBiasChange(b)}
                        style={{
                          ...styles.biasButton,
                          ...(bias === b ? styles.biasButtonActive(b) : {}),
                        }}
                      >
                        {biasLabel[b]}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Chart link</label>
                  <input
                    type="text"
                    placeholder="https://tradingview.com/..."
                    value={chartLink}
                    onChange={handleChartChange}
                    style={styles.input}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Notes / Commentary</label>
                  <textarea
                    rows={4}
                    placeholder="Bias, key levels, what you expect today..."
                    value={notes}
                    onChange={handleNotesChange}
                    style={styles.textarea}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, any> = {
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  rowCard: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 3fr)',
    gap: '20px',
    alignItems: 'stretch',
  },
  chartPreview: {
    borderRadius: '10px',
    overflow: 'hidden',
    border: '1px solid var(--border-subtle)',
    backgroundColor: '#F3F4F6',
    minHeight: '220px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  chartPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPlaceholderText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  instrumentTitle: {
    fontSize: '16px',
    fontWeight: 700,
  },
  biasGroup: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
  },
  biasButton: {
    fontSize: '11px',
    padding: '4px 10px',
    borderRadius: '999px',
    border: '1px solid var(--border-subtle)',
    backgroundColor: '#FFFFFF',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  biasButtonActive: (b: Bias) => ({
    borderColor:
      b === 'bull'
        ? 'var(--color-green)'
        : b === 'bear'
        ? 'var(--color-red)'
        : '#9CA3AF',
    backgroundColor:
      b === 'bull'
        ? '#ECFDF5'
        : b === 'bear'
        ? '#FEF2F2'
        : '#E5E7EB',
    color:
      b === 'bull'
        ? '#059669'
        : b === 'bear'
        ? '#DC2626'
        : '#374151',
  }),
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  input: {
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid var(--border-subtle)',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  textarea: {
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid var(--border-subtle)',
    fontSize: '13px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
  },
};
3. Calendar Cell Layout – Symbol & Emoji Under Day Number
Adjust the existing Calendar page so that:

In each day cell, the day number stays in the top-left.

Directly underneath, show:

First line: symbol (e.g. XAUUSD ✅).

Second line: total R result for that day (e.g. 3.00R).

Keep the existing logic that reads trade performance per day (from setup-features-01.md). Only adjust layout.

File: src/renderer/src/pages/CalendarPage.tsx

Locate where each day cell is rendered (the map over days).

Inside the cell, keep using the same aggregated data, but structure it like:

tsx
Copy code
<div style={styles.dayBox}>
  <span style={styles.dayNumber}>{dayNumber}</span>

  {hasData && (
    <div style={styles.dayContent}>
      <span style={styles.symbolLine}>
        {symbol} {emoji}
      </span>
      <span style={styles.pnlLine}>{formattedR}</span>
    </div>
  )}
</div>
Add styles similar to:

ts
Copy code
dayContent: {
  marginTop: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  fontSize: '11px',
},
symbolLine: {
  fontWeight: 600,
},
pnlLine: {
  fontWeight: 600,
  color: isPositive ? 'var(--color-green)' : isNegative ? 'var(--color-red)' : 'var(--text-secondary)',
},
Reuse existing positive/negative color logic instead of introducing new ones.

4. Dashboard – “View today’s analysis” Button
Add a small button under the “Today’s focus” section that navigates to the Morning Analysis page.

4.1 Update App to expose navigation
File: src/renderer/src/App.tsx

Ensure App tracks currentPage (Dashboard, Morning Analysis, Today, Calendar, Settings).

When rendering DashboardPage, pass a prop:

tsx
Copy code
<DashboardPage onViewMorningAnalysis={() => setCurrentPage('morning')} />
(Don’t change how trades or focus instruments are loaded; just add this extra prop.)

4.2 Update DashboardPage to render the button
File: src/renderer/src/pages/DashboardPage.tsx

Add a prop:

ts
Copy code
interface DashboardPageProps {
  onViewMorningAnalysis?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onViewMorningAnalysis }) => { ... }
Under the “Today’s focus” cards, add a subtle text button:

tsx
Copy code
{onViewMorningAnalysis && (
  <div style={{ marginTop: 12 }}>
    <button
      type="button"
      onClick={onViewMorningAnalysis}
      style={styles.viewAnalysisButton}
    >
      View today’s analysis
    </button>
  </div>
)}
Add style:

ts
Copy code
viewAnalysisButton: {
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--accent-primary)',
  backgroundColor: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
},
Do not modify how cards themselves are rendered.

5. Settings Position (Sidebar)
If not already done by previous specs:

Ensure “Settings” stays pinned at the bottom of the sidebar.

File: src/renderer/src/components/Sidebar.tsx

Keep the main navigation (Dashboard, Morning Analysis, Today, Calendar) in one group.

Render the Settings button in a separate block aligned to the bottom using justify-content: space-between on the sidebar container.

If this is already implemented, leave it as-is.

6. Notes on Bilingual Support (TR / EN)
This spec does not fully implement i18n yet, but all new texts are written in English only in a way that can later be moved to a translation file.

You can later introduce a language toggle in Settings and replace hardcoded strings with a t('key') helper without changing the logic defined here.

7. Final check
After implementing all steps:

Run:

bash
Copy code
npm run dev
Verify in the Electron window:

Morning Analysis:

Each row horizontal with chart preview on the left, controls on the right.

Pasting a TradingView snapshot URL into “Chart link” shows the image.

Notes and bias are persisted per day & symbol across restarts.

Calendar:

For days with trades, symbol + emoji on the first line, R result on the second line, directly under the day number.

Dashboard:

“View today’s analysis” button appears under “Today’s focus” and switches to the Morning Analysis page when clicked.

Settings:

Still pinned at the bottom of the sidebar.

End of specification.