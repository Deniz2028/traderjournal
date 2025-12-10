# Trade Journal UI – File Specification

This document defines ONLY the **renderer React UI** for an
Electron + Vite + React + TypeScript app created with `electron-vite`.

The agent MUST:

- Assume the standard `electron-vite` structure.
- Work ONLY inside `src/renderer/src` for React files and CSS.
- Create **all files listed below** with EXACT content.
- Create folders if they do not exist.
- NOT modify `package.json`, `vite.config.ts`, or Electron main files.

---

## 1. Global Styles

**File:** `src/renderer/src/assets/main.css`

```css
:root {
  /* Theme Colors */
  --bg-app: #F5F7FB;       /* Very light cool gray */
  --bg-sidebar: #FFFFFF;
  --bg-card: #FFFFFF;

  /* Borders & Lines */
  --border-subtle: #E0E3EC;

  /* Typography */
  --text-primary: #111827;
  --text-secondary: #6B7280;

  /* Accents */
  --accent-primary: #2563EB;
  --accent-hover: #F3F4F6;

  /* Trading Colors */
  --color-green: #10B981;
  --color-red: #EF4444;

  /* Layout */
  --sidebar-width: 240px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    Helvetica, Arial, sans-serif;
  background-color: var(--bg-app);
  color: var(--text-primary);
  font-size: 14px;
  overflow: hidden; /* App handles scroll internally */
}

/* Layout Wrappers */

.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}

/* Page Header */

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Card */

.card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

/* Buttons (reset) */

button {
  cursor: pointer;
  border: none;
  font-family: inherit;
}

/* Simple utility for muted text */

.text-muted {
  color: var(--text-secondary);
  font-size: 13px;
}
2. Sidebar Component
File: src/renderer/src/components/Sidebar.tsx

tsx
Copy code
import React from "react";

export type Page = "dashboard" | "morning" | "today" | "calendar" | "settings";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
}) => {
  const menuItems: { id: Page; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "morning", label: "Morning Analysis" },
    { id: "today", label: "Today" },
    { id: "calendar", label: "Calendar" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div style={styles.sidebar}>
      <div style={styles.logoArea}>
        <h2 style={styles.logoText}>Trade Journal</h2>
      </div>

      <nav style={styles.nav}>
        {menuItems.map((item) => {
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
3. Pages
3.1 Dashboard Page
File: src/renderer/src/pages/DashboardPage.tsx

tsx
Copy code
import React from "react";

export const DashboardPage: React.FC = () => {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Weekly overview</p>
      </div>

      {/* Weekly Stats Row */}
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

      {/* Recent Trades */}
      <div style={{ marginTop: 32 }}>
        <h3 style={styles.sectionTitle}>Recent trades</h3>
        <div className="card" style={styles.recentBox}>
          <div style={styles.recentRow}>
            <span style={styles.symbol}>XAUUSD</span>
            <span style={{ color: "var(--color-green)", fontWeight: 600 }}>
              +1.2 R
            </span>
          </div>
          <div style={{ ...styles.recentRow, borderBottom: "none" }}>
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
3.2 Morning Analysis Page
File: src/renderer/src/pages/MorningAnalysisPage.tsx

tsx
Copy code
import React from "react";

interface AnalysisCardProps {
  instrument: string;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ instrument }) => (
  <div className="card" style={styles.card}>
    <div style={styles.cardHeader}>
      <h3 style={styles.cardTitle}>{instrument}</h3>
      <div style={styles.biasGroup}>
        <button
          style={{
            ...styles.biasBtn,
            color: "var(--color-green)",
            borderColor: "var(--color-green)",
          }}
        >
          Bull
        </button>
        <button style={styles.biasBtn}>Neutral</button>
        <button
          style={{
            ...styles.biasBtn,
            color: "var(--color-red)",
            borderColor: "var(--color-red)",
          }}
        >
          Bear
        </button>
      </div>
    </div>

    <div style={styles.inputGroup}>
      <label style={styles.label}>Key levels</label>
      <textarea
        style={styles.textarea}
        rows={3}
        placeholder="104.50, 105.20..."
      />
    </div>

    <div style={styles.inputGroup}>
      <label style={styles.label}>Notes</label>
      <textarea
        style={styles.textarea}
        rows={4}
        placeholder="Watching for rejection at..."
      />
    </div>

    <div style={styles.inputGroup}>
      <label style={styles.label}>Chart link</label>
      <input
        type="text"
        style={styles.input}
        placeholder="https://tradingview.com/..."
      />
    </div>
  </div>
);

export const MorningAnalysisPage: React.FC = () => {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Morning Analysis</h1>
        <p className="page-subtitle">DXY, Gold, EUR bias &amp; key levels</p>
      </div>

      <div style={styles.grid}>
        <AnalysisCard instrument="DXY (Dollar Index)" />
        <AnalysisCard instrument="XAUUSD (Gold)" />
        <AnalysisCard instrument="EURUSD (Euro)" />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 24,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
  },
  biasGroup: {
    display: "flex",
    gap: 4,
  },
  biasBtn: {
    fontSize: 10,
    padding: "4px 8px",
    borderRadius: 4,
    border: "1px solid #E5E7EB",
    backgroundColor: "#fff",
    fontWeight: 600,
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  textarea: {
    width: "100%",
    padding: 10,
    borderRadius: 6,
    border: "1px solid var(--border-subtle)",
    fontFamily: "inherit",
    fontSize: 13,
    resize: "vertical",
    outline: "none",
  },
  input: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid var(--border-subtle)",
    fontFamily: "inherit",
    fontSize: 13,
    outline: "none",
  },
};
3.3 Today Page
File: src/renderer/src/pages/TodayPage.tsx

tsx
Copy code
import React, { useState } from "react";

interface Trade {
  id: number;
  symbol: string;
  dir: "Long" | "Short";
  result: string;
  time: string;
  status: "Reviewed" | "Pending";
}

export const TodayPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  const trades: Trade[] = [
    { id: 1, symbol: "XAUUSD", dir: "Long", result: "+1.5R", time: "09:30", status: "Reviewed" },
    { id: 2, symbol: "EURUSD", dir: "Short", result: "-0.5R", time: "10:15", status: "Pending" },
    { id: 3, symbol: "GBPUSD", dir: "Long", result: "+2.1R", time: "11:00", status: "Pending" },
    { id: 4, symbol: "NAS100", dir: "Short", result: "-1.0R", time: "14:30", status: "Reviewed" },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Today</h1>
        <p className="page-subtitle">Today's trades &amp; review</p>
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
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
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
                <td style={{ ...styles.td, fontWeight: 600 }}>{trade.result}</td>
                <td style={styles.td}>{trade.time}</td>
                <td style={styles.td}>{trade.status}</td>
                <td style={styles.td}>
                  <button
                    style={styles.reviewBtn}
                    onClick={() => setShowModal(true)}
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={styles.modalOverlay}>
          <div className="card" style={styles.modalContent}>
            <h3>Trade Review</h3>
            <p style={{ margin: "16px 0", color: "#6B7280" }}>
              Did you follow your plan? What emotions did you feel?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                style={styles.closeBtn}
                onClick={() => setShowModal(false)}
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
  badge: {
    padding: "4px 8px",
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
  },
  reviewBtn: {
    backgroundColor: "#ffffff",
    border: "1px solid var(--border-subtle)",
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 12,
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
    width: 400,
  },
  closeBtn: {
    backgroundColor: "var(--text-primary)",
    color: "#ffffff",
    padding: "8px 16px",
    borderRadius: 6,
  },
};
3.4 Calendar Page
File: src/renderer/src/pages/CalendarPage.tsx

tsx
Copy code
import React from "react";

export const CalendarPage: React.FC = () => {
  const days = Array.from({ length: 35 }, (_, i) => i + 1);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Calendar</h1>
        <p className="page-subtitle">Daily performance overview</p>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div style={styles.grid}>
          {days.map((day) => {
            const hasTrade = day % 3 === 0;
            const isGreen = day % 4 !== 0;

            return (
              <div key={day} style={styles.dayBox}>
                <span style={styles.dayNumber}>{day <= 31 ? day : ""}</span>
                {day <= 31 && hasTrade && (
                  <div
                    style={{
                      ...styles.pnlTag,
                      backgroundColor: isGreen ? "#ECFDF5" : "#FEF2F2",
                      color: isGreen ? "#059669" : "#DC2626",
                    }}
                  >
                    {isGreen ? "+1.2R" : "-0.5R"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
    height: 100,
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
  pnlTag: {
    fontSize: 11,
    fontWeight: 700,
    padding: 4,
    borderRadius: 4,
    textAlign: "center",
  },
};
3.5 Settings Page
File: src/renderer/src/pages/SettingsPage.tsx

tsx
Copy code
import React from "react";

export const SettingsPage: React.FC = () => {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>
      <div className="card">
        <p className="text-muted">
          Settings will be available here soon.
        </p>
      </div>
    </div>
  );
};
4. Main App Component
File: src/renderer/src/App.tsx

tsx
Copy code
import React, { useState } from "react";
import "./assets/main.css";

import { Sidebar, Page } from "./components/Sidebar";
import { DashboardPage } from "./pages/DashboardPage";
import { MorningAnalysisPage } from "./pages/MorningAnalysisPage";
import { TodayPage } from "./pages/TodayPage";
import { CalendarPage } from "./pages/CalendarPage";
import { SettingsPage } from "./pages/SettingsPage";

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />;
      case "morning":
        return <MorningAnalysisPage />;
      case "today":
        return <TodayPage />;
      case "calendar":
        return <CalendarPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="main-content">{renderPage()}</main>
    </div>
  );
};

export default App;
IMPORTANT:
The existing src/renderer/src/main.tsx created by electron-vite should remain unchanged, except it must import this App as default from ./App. This is already the default behavior; the agent should only ensure the import path is correct.

5. After Files Are Created
After all files above are created:

The agent should NOT run npm install or npm run dev.

The human user will run:

bash
Copy code
npm install
npm run dev
At this point the Electron window should display the TraderVue-style Trade Journal UI with:

Sidebar (Dashboard, Morning Analysis, Today, Calendar, Settings)

Dashboard weekly cards and recent trades

Morning analysis cards for DXY, Gold, EUR

Today trades table with review modal

Calendar grid with R-results

Simple Settings placeholder

End of specification.

