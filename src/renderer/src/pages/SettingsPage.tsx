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






