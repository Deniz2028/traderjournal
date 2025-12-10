# Trade Journal – Today MTF Execution Journal v3

Amaç:

- Today sayfasındaki MTF pre/post trade akışını gerçek trade workflow’una yaklaştırmak.
- Değişiklikler:
  - “Daily bias” yazan yer artık **“Trade bias”** olacak (işlem yönü).
  - Her timeframe için bias’lar aynı şekilde kalacak.
  - Pre-trade plan **Save** edildikten sonra:
    - Edit modu kapanacak.
    - Sadece **en küçük timeframe**’in (genelde 5m) chart’ı + notları görünecek.
    - Sağ üstte, işlemin ana yönünü gösteren bir **Trade bias badge’i** olacak.
    - “Edit plan” ve “Trade closed” butonları görünecek.
  - Post-trade review:
    - Pre-trade plan kaydedilmeden görünmeyecek.
    - “Trade closed” butonuna basınca açılacak.
    - “Back to plan” ile pre-trade özetine geri dönülebilecek.
    - Save edildikten sonra **post-trade özet modu**na geçilecek.
  - Mevcut trade tablosu (aşağıdaki grid) aynen kalacak; bu patch yalnızca MTF journal kısmını düzenliyor.

> Not: Bu yamada trades backend’e otomatik trade push etme kısmına dokunmuyoruz. O kısım bir sonraki adımda, backend API yapına bakarak ayrıca bağlanacak.

---

## 1. Journal tipleri ve storage helper

### File: `src/renderer/src/utils/journalStorage.ts`

Bu dosyanın **tamamını** aşağıdaki ile değiştir:

```ts
// src/renderer/src/utils/journalStorage.ts

// --- Types --------------------------------------------------------

export type Bias3 = "Long" | "Short" | "Neutral";
export type Outcome = "TP" | "SL" | "BE";

export interface MtfFrame {
  id: string;        // "4H", "15m", "5m" gibi uniq id
  timeframe: string; // ekranda görünen label
  bias: Bias3;
  link: string;
  notes: string;
}

export interface TodayJournal {
  dateISO: string;     // "2025-12-11"
  symbol: string;      // XAUUSD
  tradeBias: Bias3;    // ana işlem yönü (eski dailyBias)
  frames: MtfFrame[];

  // pre-trade kaydedildi mi?
  preSaved: boolean;

  // post-trade alanları
  outcome?: Outcome;
  resultR?: number | null;
  exitLink?: string;
  exitNotes?: string;
}

// --- Internal helpers ---------------------------------------------

const STORAGE_KEY = "tj_today_mtf_v3";

interface RawStore {
  [dateISO: string]: any;
}

function loadStore(): RawStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as RawStore;
  } catch {
    return {};
  }
}

function saveStore(store: RawStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// Eski v2/v1 kayıtlardan migrate etmek için küçük yardımcı.
// dailyBias alanı varsa tradeBias'e taşır, preSaved yoksa çıkarım yapar.
function normalizeJournal(raw: any, dateISO: string): TodayJournal {
  const frames: MtfFrame[] =
    Array.isArray(raw?.frames) && raw.frames.length > 0
      ? raw.frames.map((f: any, idx: number) => ({
          id: String(f.id ?? idx),
          timeframe: String(f.timeframe ?? ["4H", "15m", "5m"][idx] ?? `TF${idx + 1}`),
          bias: (f.bias as Bias3) ?? "Neutral",
          link: String(f.link ?? ""),
          notes: String(f.notes ?? ""),
        }))
      : [
          { id: "0", timeframe: "4H", bias: "Neutral", link: "", notes: "" },
          { id: "1", timeframe: "15m", bias: "Neutral", link: "", notes: "" },
          { id: "2", timeframe: "5m", bias: "Neutral", link: "", notes: "" },
        ];

  const tradeBias: Bias3 =
    (raw?.tradeBias as Bias3) ??
    (raw?.dailyBias as Bias3) ??
    "Neutral";

  // preSaved alanı yoksa, sembol veya herhangi bir frame link/not var mı diye bak.
  const hasAnyContent =
    (raw?.symbol && String(raw.symbol).trim() !== "") ||
    frames.some((f) => f.link || f.notes);

  const preSaved: boolean =
    typeof raw?.preSaved === "boolean" ? raw.preSaved : hasAnyContent;

  const journal: TodayJournal = {
    dateISO,
    symbol: String(raw?.symbol ?? "XAUUSD"),
    tradeBias,
    frames,
    preSaved,
    outcome: raw?.outcome as Outcome | undefined,
    resultR:
      typeof raw?.resultR === "number" ? raw.resultR : null,
    exitLink: raw?.exitLink ? String(raw.exitLink) : "",
    exitNotes: raw?.exitNotes ? String(raw.exitNotes) : "",
  };

  return journal;
}

// Default boş journal
function createEmptyJournal(dateISO: string): TodayJournal {
  return {
    dateISO,
    symbol: "XAUUSD",
    tradeBias: "Neutral",
    frames: [
      { id: "0", timeframe: "4H", bias: "Neutral", link: "", notes: "" },
      { id: "1", timeframe: "15m", bias: "Neutral", link: "", notes: "" },
      { id: "2", timeframe: "5m", bias: "Neutral", link: "", notes: "" },
    ],
    preSaved: false,
    outcome: undefined,
    resultR: null,
    exitLink: "",
    exitNotes: "",
  };
}

// --- Public API ---------------------------------------------------

export function loadJournalForDate(dateISO: string): TodayJournal {
  const store = loadStore();
  const raw = store[dateISO];
  if (!raw) return createEmptyJournal(dateISO);
  return normalizeJournal(raw, dateISO);
}

export function saveJournalForDate(journal: TodayJournal) {
  const store = loadStore();
  store[journal.dateISO] = journal;
  saveStore(store);
}

export function hasPostReview(journal: TodayJournal): boolean {
  return typeof journal.outcome === "string";
}
2. Today MTF Page – yeni akış
File: src/renderer/src/pages/TodayPage.tsx
Bu dosyanın tamamını aşağıdaki ile değiştir:

tsx
Copy code
// src/renderer/src/pages/TodayPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  Bias3,
  Outcome,
  MtfFrame,
  TodayJournal,
  loadJournalForDate,
  saveJournalForDate,
  hasPostReview,
} from "../utils/journalStorage";

// NOT: Trades backend / tablo kısmına dokunmamak için
// mevcut trade table componentini ayrı bir dosyada tutuyorsan
// buraya import etmeye devam et.
// Örn:
// import { TodayTradesTable } from "../components/TodayTradesTable";
//
// Eğer aynı dosyanın içindeyse, bu componentin altına
// mevcut tablo kodunu bırakabilirsin. Aşağıda sadece
// journal / MTF kısmı güncelleniyor.

type ViewMode = "editingPre" | "preSummary" | "editingPost" | "postSummary";

const biasOptions: Bias3[] = ["Long", "Short", "Neutral"];
const outcomeOptions: Outcome[] = ["TP", "SL", "BE"];

export const TodayPage: React.FC = () => {
  const todayISO = new Date().toISOString().slice(0, 10);

  const [journal, setJournal] = useState<TodayJournal>(() =>
    loadJournalForDate(todayISO),
  );

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (!journal.preSaved) return "editingPre";
    if (hasPostReview(journal)) return "postSummary";
    return "preSummary";
  });

  // Aktif timeframe tab'i: default olarak ilk frame
  const [activeFrameId, setActiveFrameId] = useState<string>(
    journal.frames[0]?.id ?? "0",
  );

  // Post trade numeric input string olarak tutulur
  const [resultRInput, setResultRInput] = useState<string>(
    journal.resultR != null ? String(journal.resultR) : "",
  );

  // journal değiştikçe store'a yaz
  useEffect(() => {
    saveJournalForDate(journal);
  }, [journal]);

  // En küçük timeframe: son frame'i küçük kabul ediyoruz (4H, 15m, 5m gibi)
  const smallestFrame: MtfFrame = useMemo(
    () => journal.frames[journal.frames.length - 1] ?? journal.frames[0],
    [journal.frames],
  );

  const updateFrame = (frameId: string, patch: Partial<MtfFrame>) => {
    setJournal((prev) => ({
      ...prev,
      frames: prev.frames.map((f) =>
        f.id === frameId ? { ...f, ...patch } : f,
      ),
    }));
  };

  const setTradeBias = (bias: Bias3) => {
    setJournal((prev) => ({ ...prev, tradeBias: bias }));
  };

  const setSymbol = (symbol: string) => {
    setJournal((prev) => ({ ...prev, symbol }));
  };

  const setOutcome = (outcome: Outcome) => {
    setJournal((prev) => ({ ...prev, outcome }));
  };

  const setExitLink = (link: string) => {
    setJournal((prev) => ({ ...prev, exitLink: link }));
  };

  const setExitNotes = (notes: string) => {
    setJournal((prev) => ({ ...prev, exitNotes: notes }));
  };

  const handleSavePreTrade = () => {
    setJournal((prev) => ({
      ...prev,
      preSaved: true,
    }));
    setViewMode(hasPostReview(journal) ? "postSummary" : "preSummary");
  };

  const handleSavePostTrade = () => {
    const cleaned = resultRInput.replace(",", ".").trim();
    const value =
      cleaned === "" || Number.isNaN(Number(cleaned))
        ? null
        : Number(cleaned);

    setJournal((prev) => ({
      ...prev,
      resultR: value,
    }));
    setViewMode("postSummary");
  };

  // --- Render helpers ------------------------------------------------

  const renderBiasToggle = (
    current: Bias3,
    onChange: (b: Bias3) => void,
  ) => (
    <div style={{ display: "flex", gap: 8 }}>
      {biasOptions.map((b) => {
        const active = current === b;
        return (
          <button
            key={b}
            type="button"
            onClick={() => onChange(b)}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: active
                ? "1px solid var(--accent-primary)"
                : "1px solid var(--border-subtle)",
              backgroundColor: active ? "#EFF6FF" : "#FFFFFF",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {b}
          </button>
        );
      })}
    </div>
  );

  const renderOutcomeToggle = (
    current: Outcome | undefined,
    onChange: (o: Outcome) => void,
  ) => (
    <div style={{ display: "flex", gap: 8 }}>
      {outcomeOptions.map((o) => {
        const active = current === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: active
                ? "1px solid var(--accent-primary)"
                : "1px solid var(--border-subtle)",
              backgroundColor: active ? "#EFF6FF" : "#FFFFFF",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );

  const renderChartPreview = (link: string, alt: string) => {
    const hasLink = link.trim().length > 0;
    if (!hasLink) {
      return (
        <div
          style={{
            borderRadius: 12,
            border: "1px dashed var(--border-subtle)",
            padding: 24,
            fontSize: 13,
            color: "var(--text-secondary)",
            textAlign: "center",
          }}
        >
          Paste TradingView snapshot URL to see preview.
        </div>
      );
    }

    return (
      <div
        style={{
          borderRadius: 12,
          border: "1px solid var(--border-subtle)",
          overflow: "hidden",
          backgroundColor: "#000",
        }}
      >
        {/* 1080p geniş görüntü için genişlik kontrolünü parent card çözecek */}
        <img
          src={link}
          alt={alt}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
          }}
        />
      </div>
    );
  };

  // --- Pre-trade: editing mode --------------------------------------

  const renderPreTradeEditing = () => {
    const activeFrame =
      journal.frames.find((f) => f.id === activeFrameId) ??
      journal.frames[0];

    return (
      <div className="card" style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              Today&apos;s MTF Plan
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              Date: {todayISO} • Symbol & intraday multi-timeframe plan
            </p>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
              }}
            >
              Trade bias
            </span>
            <div>{renderBiasToggle(journal.tradeBias, setTradeBias)}</div>
          </div>
        </div>

        {/* Symbol */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-secondary)",
              display: "block",
              marginBottom: 4,
            }}
          >
            Symbol
          </label>
          <input
            value={journal.symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            style={{
              width: 260,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--border-subtle)",
              fontSize: 13,
            }}
          />
        </div>

        {/* Timeframe tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {journal.frames.map((f) => {
            const active = f.id === activeFrameId;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFrameId(f.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: active
                    ? "1px solid #FB923C"
                    : "1px solid var(--border-subtle)",
                  backgroundColor: active ? "#FFF7ED" : "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {f.timeframe}
              </button>
            );
          })}
        </div>

        {/* Active frame edit area */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.4fr)",
            gap: 24,
          }}
        >
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: 4,
              }}
            >
              Chart link (TradingView snapshot URL)
            </label>
            <input
              value={activeFrame.link}
              onChange={(e) =>
                updateFrame(activeFrame.id, { link: e.target.value })
              }
              placeholder="https://s3.tradingview.com/snapshots/..."
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--border-subtle)",
                fontSize: 13,
                marginBottom: 12,
              }}
            />
            {renderChartPreview(
              activeFrame.link,
              `${journal.symbol} ${activeFrame.timeframe} plan`,
            )}
          </div>

          <div>
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                  }}
                >
                  {activeFrame.timeframe} bias
                </span>
              </div>
              {renderBiasToggle(activeFrame.bias, (b) =>
                updateFrame(activeFrame.id, { bias: b }),
              )}
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Notes for {activeFrame.timeframe}
              </label>
              <textarea
                value={activeFrame.notes}
                onChange={(e) =>
                  updateFrame(activeFrame.id, { notes: e.target.value })
                }
                rows={10}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border-subtle)",
                  fontSize: 13,
                  resize: "vertical",
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={handleSavePreTrade}
            style={{
              backgroundColor: "var(--accent-primary)",
              color: "#FFFFFF",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Save pre-trade plan
          </button>
        </div>
      </div>
    );
  };

  // --- Pre-trade summary mode --------------------------------------

  const renderPreTradeSummary = () => {
    return (
      <div className="card" style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 12,
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              Today&apos;s MTF Plan (summary)
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              {todayISO} • {journal.symbol}
            </p>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginTop: 4,
              }}
            >
              Showing smallest timeframe snapshot and notes. Use &quot;Edit
              plan&quot; if you want to adjust.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-secondary)",
                textAlign: "right",
              }}
            >
              Trade bias
            </span>
            <span
              style={{
                alignSelf: "flex-end",
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid var(--border-subtle)",
                backgroundColor: "#F3F4F6",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {journal.tradeBias}
            </span>
          </div>
        </div>

        {/* Smallest timeframe preview + notes */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.3fr)",
            gap: 24,
          }}
        >
          <div>
            {renderChartPreview(
              smallestFrame.link,
              `${journal.symbol} ${smallestFrame.timeframe} plan`,
            )}
          </div>
          <div>
            <div style={{ marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                {smallestFrame.timeframe} notes
              </span>
            </div>
            <div
              style={{
                borderRadius: 8,
                border: "1px solid var(--border-subtle)",
                padding: 8,
                fontSize: 13,
                minHeight: 120,
                whiteSpace: "pre-wrap",
              }}
            >
              {smallestFrame.notes || (
                <span style={{ color: "var(--text-secondary)" }}>
                  No notes saved for this timeframe.
                </span>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode("editingPre")}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--border-subtle)",
              backgroundColor: "#FFFFFF",
              fontSize: 13,
            }}
          >
            Edit plan
          </button>

          <button
            type="button"
            onClick={() => setViewMode("editingPost")}
            style={{
              backgroundColor: "#111827",
              color: "#FFFFFF",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Trade closed → add post-trade review
          </button>
        </div>
      </div>
    );
  };

  // --- Post-trade editing mode -------------------------------------

  const renderPostTradeEditing = () => {
    return (
      <div className="card" style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              Post-trade review
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              Log the final outcome of the day and what you learned.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setViewMode(hasPostReview(journal) ? "postSummary" : "preSummary")
            }
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid var(--border-subtle)",
              backgroundColor: "#FFFFFF",
              fontSize: 12,
            }}
          >
            ← Back to plan
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 2fr)",
            gap: 24,
          }}
        >
          <div>
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Outcome
              </label>
              {renderOutcomeToggle(journal.outcome, setOutcome)}
            </div>

            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Result (R)
              </label>
              <input
                value={resultRInput}
                onChange={(e) => setResultRInput(e.target.value)}
                placeholder="1.0, -0.5..."
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border-subtle)",
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Exit chart link (optional)
              </label>
              <input
                value={journal.exitLink ?? ""}
                onChange={(e) => setExitLink(e.target.value)}
                placeholder="https://s3.tradingview.com/snapshots/..."
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border-subtle)",
                  fontSize: 13,
                  marginBottom: 12,
                }}
              />
              {renderChartPreview(
                journal.exitLink ?? "",
                `${journal.symbol} exit snapshot`,
              )}
            </div>
          </div>

          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: 4,
              }}
            >
              Why TP/SL? What did you learn?
            </label>
            <textarea
              value={journal.exitNotes ?? ""}
              onChange={(e) => setExitNotes(e.target.value)}
              rows={16}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--border-subtle)",
                fontSize: 13,
                resize: "vertical",
              }}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={handleSavePostTrade}
            style={{
              backgroundColor: "var(--accent-primary)",
              color: "#FFFFFF",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Save post-trade review
          </button>
        </div>
      </div>
    );
  };

  // --- Post-trade summary mode -------------------------------------

  const renderPostTradeSummary = () => {
    return (
      <div className="card" style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              Post-trade review (summary)
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              {todayISO} • {journal.symbol}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setViewMode("preSummary")}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid var(--border-subtle)",
                backgroundColor: "#FFFFFF",
                fontSize: 12,
              }}
            >
              ← Back to plan
            </button>
            <button
              type="button"
              onClick={() => setViewMode("editingPost")}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid var(--border-subtle)",
                backgroundColor: "#F3F4F6",
                fontSize: 12,
              }}
            >
              Edit review
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 2fr)",
            gap: 24,
          }}
        >
          <div>
            <div style={{ marginBottom: 12 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Outcome & result
              </span>
              <div
                style={{
                  borderRadius: 8,
                  border: "1px solid var(--border-subtle)",
                  padding: 8,
                  fontSize: 13,
                }}
              >
                <div style={{ marginBottom: 4 }}>
                  Outcome:{" "}
                  <strong>{journal.outcome ?? "— (not set)"}</strong>
                </div>
                <div>
                  Result (R):{" "}
                  <strong>
                    {journal.resultR != null ? journal.resultR : "—"}
                  </strong>
                </div>
              </div>
            </div>

            <div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Exit snapshot
              </span>
              {renderChartPreview(
                journal.exitLink ?? "",
                `${journal.symbol} exit snapshot`,
              )}
            </div>
          </div>

          <div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: 4,
              }}
            >
              Notes
            </span>
            <div
              style={{
                borderRadius: 8,
                border: "1px solid var(--border-subtle)",
                padding: 8,
                minHeight: 160,
                fontSize: 13,
                whiteSpace: "pre-wrap",
              }}
            >
              {journal.exitNotes || (
                <span style={{ color: "var(--text-secondary)" }}>
                  No post-trade notes saved.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- Page layout --------------------------------------------------

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Today</h1>
        <p className="page-subtitle">
          Today&apos;s trades &amp; MTF execution journal ({todayISO})
        </p>
      </div>

      {/* Journal alanı */}
      {viewMode === "editingPre" && renderPreTradeEditing()}
      {viewMode === "preSummary" && renderPreTradeSummary()}
      {viewMode === "editingPost" && renderPostTradeEditing()}
      {viewMode === "postSummary" && renderPostTradeSummary()}

      {/* Buradan sonrası: mevcut trade tablosu */}
      {/* Eğer tablo ayrı bir component ise: */}
      {/* <TodayTradesTable /> */}
      {/* Eğer tablo kodu bu dosyadaysa, journal cardlarının ALTINDA bırak. */}
    </div>
  );
};
