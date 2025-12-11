// src/renderer/src/pages/SettingsPage.tsx
import React, { useEffect, useState } from "react";
import {
  ALL_INSTRUMENTS,
  getDashboardInstruments,
  saveDashboardInstruments,
} from "../utils/settingsStorage";
import { getAppToday, setAppToday, isSimulationMode } from "../utils/appDate";
import {
  AVAILABLE_TFS,
  loadMorningMtfSettings,
  saveMorningMtfSettings,
  type MorningMtfSettings,
  getTimeframesForSymbol,
} from "../utils/morningMtfSettings";

import type { Achievement, CurrencyCode } from "../types/achievements";
import {
  loadAchievements,
  addAchievement,
  removeAchievement,
  getTotals,
} from "../utils/achievementsStorage";




export const SettingsPage: React.FC = () => {
  const [dashboardSymbols, setDashboardSymbols] = useState<string[]>([]);
  const [mtfSettings, setMtfSettings] = useState<MorningMtfSettings>({});

  // For UI state - which instrument we are editing MTF settings for
  const [activeSymbol, setActiveSymbol] = useState<string>("XAUUSD");

  const [simDate, setSimDate] = useState(isSimulationMode() ? getAppToday() : "");

  const handleSaveSim = () => {
    if (simDate) {
      setAppToday(simDate);
      alert(`Simulation Mode Enabled: Today is now ${simDate}`);
    } else {
      setAppToday(null);
      alert("Simulation Mode Disabled. Back to reality.");
    }
    window.location.reload(); // Reload to apply everywhere
  };

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
          // Max 3 TFs, replace last or just ignore? Let's just limit to 3.
          // Or maybe FIFO? Let's strict limit.
          alert("Max 3 timeframes allowed.");
          return prev; // No change
        } else {
          next = [...current, tf];
        }
      }

      // Sort priority: M, W, D, 4H, 1H, 15m, 5m
      // Simple sort by index in AVAILABLE_TFS
      next.sort((a, b) => AVAILABLE_TFS.indexOf(a) - AVAILABLE_TFS.indexOf(b));

      return {
        ...prev,
        [symbol]: next,
      };
    });
  };

  const handleSave = () => {
    saveDashboardInstruments(dashboardSymbols);
    saveMorningMtfSettings(mtfSettings);
    alert("Settings saved!");
  };

  // Current TFs for active symbol
  const currentFrames = getTimeframesForSymbol(activeSymbol, mtfSettings);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">App configuration</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {/* Dashboard Instruments */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            Dashboard Instruments
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            Select instruments to show on the Dashboard "Focus" area.
          </p>

          <div style={{ marginBottom: 16, display: "flex", gap: 12 }}>
            <select
              style={{ padding: "8px", borderRadius: 6, border: "1px solid var(--border-subtle)", minWidth: 200 }}
              onChange={(e) => {
                const val = e.target.value;
                if (val && !dashboardSymbols.includes(val)) {
                  toggleDashboardSymbol(val);
                  e.target.value = ""; // reset
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>+ Add Instrument</option>
              {ALL_INSTRUMENTS.filter(s => !dashboardSymbols.includes(s)).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {dashboardSymbols.map((symbol) => (
              <div
                key={symbol}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid var(--accent-primary)",
                  backgroundColor: "#EEF2FF",
                  color: "var(--accent-primary)",
                  fontSize: 13,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                {symbol}
                <button
                  onClick={() => toggleDashboardSymbol(symbol)}
                  style={{ border: "none", background: "transparent", color: "var(--accent-primary)", cursor: "pointer", fontWeight: 700, padding: 0 }}
                >
                  ×
                </button>
              </div>
            ))}
            {dashboardSymbols.length === 0 && (
              <span style={{ fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic" }}>No instruments selected.</span>
            )}
          </div>
        </div>


        {/* MTF Configuration */}

        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            Morning Analysis Timeframes
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            Select up to 3 timeframes for each instrument to track in Morning Analysis.
          </p>

          {/* Instrument Selector for MTF */}
          <div style={{ marginBottom: 16, borderBottom: "1px solid var(--border-subtle)", paddingBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Select Instrument to Edit:</div>

            <select
              value={activeSymbol}
              onChange={(e) => setActiveSymbol(e.target.value)}
              style={{ padding: "8px", borderRadius: 6, border: "1px solid var(--border-subtle)", minWidth: 200 }}
            >
              {ALL_INSTRUMENTS.map(sym => (
                <option key={sym} value={sym}>{sym}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Editing:
            </span>{" "}
            <strong>{activeSymbol || "None"}</strong>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {AVAILABLE_TFS.map((tf) => {
              const isOn = currentFrames.includes(tf);
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => toggleTimeframe(activeSymbol, tf)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: isOn
                      ? "1px solid var(--accent-primary)"
                      : "1px solid var(--border-subtle)",
                    backgroundColor: isOn ? "#EEF2FF" : "#FFFFFF",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer"
                  }}
                >
                  {tf}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleSave}
            style={{
              backgroundColor: "var(--accent-primary)",
              color: "#FFFFFF",
              padding: "8px 24px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              border: "none"
            }}
          >
            Save Settings
          </button>
        </div>

        {/* Achievements */}
        <div className="card" style={{ marginTop: 40, padding: "20px 24px" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
            Achievements
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              marginBottom: 16,
            }}
          >
            Track your funded accounts, payouts and important milestones. Data is stored
            locally on this device.
          </p>

          <AchievementsSection />
        </div>

        <div style={{ marginTop: 40, borderTop: "1px solid var(--border-subtle)", paddingTop: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Developer / Simulation</h2>
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Time Travel</h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
              Force the application to verify "Today" as a specific date. Useful for backtesting or development.
            </p>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <input
                type="date"
                value={simDate}
                onChange={(e) => setSimDate(e.target.value)}
                style={{
                  padding: "8px",
                  borderRadius: 6,
                  border: "1px solid var(--border-subtle)",
                  fontSize: 14
                }}
              />
              <button
                onClick={handleSaveSim}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: "none",
                  backgroundColor: isSimulationMode() ? "#DC2626" : "#2563EB",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 500
                }}
              >
                {isSimulationMode() ? "Disable Simulation" : "Enable Simulation"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const currencyOptions: { value: CurrencyCode; label: string }[] = [
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "Other", label: "Other" },
];

const AchievementsSection: React.FC = () => {
  const [items, setItems] = useState<Achievement[]>([]);
  const [firm, setFirm] = useState("");
  const [title, setTitle] = useState("");
  const [accountSize, setAccountSize] = useState("");
  const [payout, setPayout] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [imageUrl, setImageUrl] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setItems(loadAchievements());
  }, []);

  const handleAdd = () => {
    if (!firm.trim() && !title.trim()) return;

    const now = new Date();
    const id = String(now.getTime());

    const newItem: Achievement = {
      id,
      firm: firm.trim() || "Unknown",
      title: title.trim() || "Funded account",
      accountSize: Number(accountSize) || 0,
      payout: Number(payout) || 0,
      currency,
      imageUrl: imageUrl.trim() || undefined,
      date: date || undefined,
      notes: notes.trim() || undefined,
    };

    const next = addAchievement(newItem);
    setItems(next);

    // formu temizle
    setFirm("");
    setTitle("");
    setAccountSize("");
    setPayout("");
    setImageUrl("");
    setDate("");
    setNotes("");
  };

  const handleRemove = (id: string) => {
    const next = removeAchievement(id);
    setItems(next);
  };

  const totals = getTotals(items);

  return (
    <div>
      {/* Header totals */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            background: "var(--bg-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              color: "var(--text-secondary)",
              fontWeight: 600,
            }}
          >
            Total funded size
          </span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>
            {totals.totalFunded.toLocaleString()}{" "}
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              (sum of account sizes)
            </span>
          </span>
        </div>

        <div
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            background: "var(--bg-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              color: "var(--text-secondary)",
              fontWeight: 600,
            }}
          >
            Total payouts
          </span>
          <span style={{ fontSize: 18, fontWeight: 700 }}>
            {totals.totalPayout.toLocaleString()}{" "}
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              (sum of payouts)
            </span>
          </span>
        </div>
      </div>

      {/* Add new achievement form */}
      <div
        style={{
          border: "1px solid var(--border-subtle)",
          borderRadius: 10,
          padding: 16,
          marginBottom: 20,
          display: "grid",
          gridTemplateColumns: "3fr 2fr",
          gap: 12,
        }}
      >
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Prop firm / broker</label>
              <input
                className="input"
                value={firm}
                onChange={(e) => setFirm(e.target.value)}
                placeholder="FTMO, MyForexFunds..."
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Title</label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="200k Challenge Passed"
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Account size</label>
              <input
                className="input"
                type="number"
                value={accountSize}
                onChange={(e) => setAccountSize(e.target.value)}
                placeholder="200000"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Payout</label>
              <input
                className="input"
                type="number"
                value={payout}
                onChange={(e) => setPayout(e.target.value)}
                placeholder="3500"
              />
            </div>
            <div style={{ width: 110 }}>
              <label className="form-label">Currency</label>
              <select
                className="input"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              >
                {currencyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Image URL (PNG/JPG)</label>
              <input
                className="input"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div style={{ width: 140 }}>
              <label className="form-label">Date</label>
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Notes (optional)</label>
            <textarea
              className="input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Short note about this payout / account..."
            />
          </div>

          <div style={{ marginTop: 8 }}>
            <button
              className="btn btn-primary"
              type="button"
              onClick={handleAdd}
            >
              + Add achievement
            </button>
          </div>
        </div>

        {/* Right column – small preview */}
        <div
          style={{
            borderLeft: "1px dashed var(--border-subtle)",
            paddingLeft: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              marginBottom: 4,
            }}
          >
            Preview
          </span>
          {imageUrl ? (
            <div
              style={{
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid var(--border-subtle)",
                maxHeight: 200,
              }}
            >
              <img
                src={imageUrl}
                alt="Achievement preview"
                style={{ width: "100%", display: "block", objectFit: "cover" }}
              />
            </div>
          ) : (
            <div
              style={{
                borderRadius: 10,
                border: "1px dashed var(--border-subtle)",
                padding: 12,
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              Paste a PNG/JPG URL to preview it here. (Local file upload can be
              added in a future version.)
            </div>
          )}
        </div>
      </div>

      {/* Existing achievements list */}
      {items.length > 0 && (
        <>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Saved achievements
          </h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Firm</th>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Account</th>
                <th style={thStyle}>Payout</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td style={tdStyle}>{a.firm}</td>
                  <td style={tdStyle}>{a.title}</td>
                  <td style={tdStyle}>
                    {a.accountSize.toLocaleString()} {a.currency}
                  </td>
                  <td style={tdStyle}>
                    {a.payout.toLocaleString()} {a.currency}
                  </td>
                  <td style={tdStyle}>{a.date || "—"}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => handleRemove(a.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Image gallery */}
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Achievement gallery
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            {items
              .filter((a) => a.imageUrl)
              .map((a) => (
                <div
                  key={a.id}
                  style={{
                    borderRadius: 10,
                    border: "1px solid var(--border-subtle)",
                    overflow: "hidden",
                    background: "var(--bg-subtle)",
                  }}
                >
                  <div style={{ maxHeight: 140, overflow: "hidden" }}>
                    <img
                      src={a.imageUrl}
                      alt={a.title}
                      style={{
                        width: "100%",
                        display: "block",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                  <div style={{ padding: 8 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        marginBottom: 2,
                      }}
                    >
                      {a.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {a.firm} – {a.payout.toLocaleString()} {a.currency}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}

      {items.length === 0 && (
        <p
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            marginTop: 4,
          }}
        >
          No achievements saved yet. Add your first funded account or payout
          above.
        </p>
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "1px solid var(--border-subtle)",
  color: "var(--text-secondary)",
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderBottom: "1px solid var(--border-subtle)",
};



