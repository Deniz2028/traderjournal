# Trade Journal – Advanced Analysis (MT5 + Mega Metrics + Dummy Mode)

## Amaç

Bu sürümde:

- Veriyi **hala MT5’ten** çekeceğiz (Windows’ta).
- Ama **MacBook veya MT5 kurulu olmayan ortamda** otomatik olarak
  **dummy (demo) veri** üreteceğiz ki UI her zaman çalışsın.
- Advanced Analysis sayfasını “mega” hale getireceğiz:

  - Toplam trade, winrate, expectancy, max drawdown
  - Equity curve + drawdown curve
  - Symbol matrix (sembol bazlı performans)
  - Session breakdown (Asia / London / New York)
  - Hour-of-day breakdown (hangi saatler iyi?)
  - Weekday breakdown (hangi günler iyi?)
  - Longest win / loss streak gibi basic streak istatistikleri

**ÖNEMLİ:**

- Mevcut Advanced Analysis v1 (MT5 + Python) mantığını koruyoruz;
  sadece **dosyaları zenginleştiriyoruz**.
- Electron main / preload / router / sidebar yapısı korunacak;
  sadece burada belirtilen dosyaları oluşturun veya tamamen değiştirin.
- MT5 olmayan ortamda (örneğin macOS) Python scripti:
  - `ok: true`, `useDummy: true` ve
  - sahte ama tutarlı bir `summary` döndürmeli.

---

## 0. Varsayımlar

- Proje `npm create electron-vite@latest` (React + TS + electron-vite) ile oluşturulmuş.
- Sidebar + routing ile `/advanced` sayfasına zaten gidilebiliyor
  (mevcut AdvancedAnalysisPage vardı, ama şimdi onun yerini bu yeni sürüm alacak).
- Aşağıdaki yollar geçerli:

- `mt5_service.py` – proje kök dizininde
- `src/main/mt5Process.ts`
- `src/preload/index.ts`
- `src/renderer/src/types/advanced.ts`
- `src/renderer/src/pages/AdvancedAnalysisPage.tsx`
- `src/renderer/src/mt5.d.ts`

---

## 1. Python Servis – MT5 + Dummy Mode

### Dosya: `mt5_service.py` (proje kökü)

Bu dosyanın **tamamını** aşağıdaki kodla değiştirin (yoksa oluşturun):

```python
# mt5_service.py
import sys
import json
import argparse
import math
from datetime import datetime, date, timedelta

try:
    import MetaTrader5 as mt5  # type: ignore
except ImportError:  # Mac / MT5 yoksa
    mt5 = None


# -----------------------
# Helper: tarih parse
# -----------------------
def iso_date(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()


# -----------------------
# Dummy summary (Mac / MT5 yoksa)
# -----------------------
def build_dummy_summary(start: date, end: date):
    """
    Macbook'ta ya da MT5 kurulmamışsa kullanılacak demo veri.
    Tarih aralığına göre deterministik ama sahte bir equity curve üretir.
    """
    days = (end - start).days + 1
    if days <= 0:
        days = 30

    # Sahte equity: hafif yukarı trend + volatilite
    equity = []
    balance = 0.0
    for i in range(days):
        d = start + timedelta(days=i)
        # basit sinüsoidal + hafif uptrend
        daily_pnl = math.sin(i / 5.0) * 50.0 + 10.0
        balance += daily_pnl
        equity.append(
            {
                "time": datetime.combine(d, datetime.min.time()).isoformat(),
                "balance": round(balance, 2),
                "profit": round(daily_pnl, 2),
            }
        )

    # Max drawdown hesapla
    peak = -1e18
    max_dd = 0.0
    dd_curve = []
    for pt in equity:
        b = pt["balance"]
        if b > peak:
            peak = b
        dd = peak - b
        dd_curve.append(
            {
                "time": pt["time"],
                "drawdown": round(dd, 2),
            }
        )
        if dd > max_dd:
            max_dd = dd

    # Dummy symbol stats
    symbols = [
        {"symbol": "XAUUSD", "trades": 40, "profit": 820.0, "winrate": 62.5},
        {"symbol": "EURUSD", "trades": 25, "profit": -120.0, "winrate": 44.0},
        {"symbol": "NAS100", "trades": 15, "profit": 540.0, "winrate": 66.7},
    ]

    # Dummy session stats
    sessions = [
        {"session": "Asia", "trades": 30, "profit": 150.0, "winrate": 50.0},
        {"session": "London", "trades": 35, "profit": 620.0, "winrate": 65.7},
        {"session": "New York", "trades": 15, "profit": 470.0, "winrate": 60.0},
    ]

    # Dummy hour-of-day stats (sadece birkaç saat)
    hours = [
        {"hour": 8, "trades": 10, "profit": 120.0, "winrate": 60.0},
        {"hour": 9, "trades": 15, "profit": 200.0, "winrate": 66.7},
        {"hour": 14, "trades": 12, "profit": -50.0, "winrate": 41.7},
        {"hour": 16, "trades": 8, "profit": 180.0, "winrate": 75.0},
    ]

    # Dummy weekday stats (0 = Monday)
    weekdays = [
        {"weekday": 0, "name": "Mon", "trades": 20, "profit": 200.0, "winrate": 55.0},
        {"weekday": 1, "name": "Tue", "trades": 18, "profit": 150.0, "winrate": 58.0},
        {"weekday": 2, "name": "Wed", "trades": 22, "profit": 250.0, "winrate": 63.0},
        {"weekday": 3, "name": "Thu", "trades": 20, "profit": 100.0, "winrate": 52.0},
        {"weekday": 4, "name": "Fri", "trades": 20, "profit": 210.0, "winrate": 60.0},
    ]

    summary = {
        "totalTrades": 80,
        "wins": 50,
        "losses": 30,
        "winrate": 62.5,
        "avgWinMoney": 80.0,
        "avgLossMoney": -60.0,
        "expectancyMoney": 18.0,
        "maxDrawdownMoney": round(max_dd, 2),
        "equityCurve": equity,
        "drawdownCurve": dd_curve,
        "symbols": symbols,
        "sessions": sessions,
        "hours": hours,
        "weekdays": weekdays,
        "longestWinStreak": 7,
        "longestLossStreak": 3,
        "useDummy": True,
    }

    return {
        "ok": True,
        "hasData": True,
        "message": "Running in dummy demo mode (MT5 not available).",
        "summary": summary,
        "useDummy": True,
    }


# -----------------------
# MT5 gerçek veriden summary
# -----------------------
def connect_mt5():
    if mt5 is None:
        return False, "MetaTrader5 Python package is not installed."
    if sys.platform != "win32":
        return False, f"MT5 is only supported on Windows. Current platform: {sys.platform}"
    if not mt5.initialize():
        return False, f"MT5 initialize() failed: {mt5.last_error()}"
    return True, None


def fetch_deals(start_dt: datetime, end_dt: datetime):
    deals = mt5.history_deals_get(start_dt, end_dt)
    if deals is None:
        return []
    return [d._asdict() for d in deals]


def build_real_summary(start: date, end: date):
    # tarih -> datetime
    start_dt = datetime.combine(start, datetime.min.time())
    end_dt = datetime.combine(end, datetime.max.time())

    deals_raw = fetch_deals(start_dt, end_dt)

    trade_types = {mt5.DEAL_TYPE_BUY, mt5.DEAL_TYPE_SELL}
    trades = [d for d in deals_raw if d.get("type") in trade_types]

    if not trades:
        return {
            "ok": True,
            "hasData": False,
            "message": "No trades found in this range.",
            "summary": None,
        }

    profits = [float(d.get("profit", 0.0)) for d in trades]
    total_trades = len(trades)
    wins = [p for p in profits if p > 0]
    losses = [p for p in profits if p < 0]

    win_count = len(wins)
    loss_count = len(losses)
    winrate = (win_count / total_trades) * 100.0 if total_trades > 0 else 0.0

    avg_win = sum(wins) / win_count if win_count > 0 else 0.0
    avg_loss = sum(losses) / loss_count if loss_count > 0 else 0.0

    if total_trades > 0 and (win_count > 0 or loss_count > 0):
        p_win = win_count / total_trades
        p_loss = loss_count / total_trades
        expectancy = p_win * avg_win + p_loss * avg_loss
    else:
        expectancy = 0.0

    # Equity & drawdown
    sorted_trades = sorted(
        trades,
        key=lambda d: d.get("time", 0),
    )
    equity = []
    dd_curve = []
    balance = 0.0
    peak = -1e18
    max_dd = 0.0

    for d in sorted_trades:
        profit = float(d.get("profit", 0.0))
        balance += profit
        t = d.get("time")
        if isinstance(t, datetime):
            t_str = t.isoformat()
        else:
            try:
                t_str = datetime.fromtimestamp(t).isoformat()
            except Exception:
                t_str = str(t)
        equity.append(
            {
                "time": t_str,
                "balance": round(balance, 2),
                "profit": round(profit, 2),
            }
        )
        # drawdown
        if balance > peak:
            peak = balance
        dd = peak - balance
        if dd > max_dd:
            max_dd = dd
        dd_curve.append(
            {
                "time": t_str,
                "drawdown": round(dd, 2),
            }
        )

    # Symbol stats
    symbol_stats = {}
    for d in trades:
        sym = d.get("symbol", "UNKNOWN")
        p = float(d.get("profit", 0.0))
        s = symbol_stats.setdefault(
            sym, {"trades": 0, "profit": 0.0, "wins": 0, "losses": 0}
        )
        s["trades"] += 1
        s["profit"] += p
        if p > 0:
            s["wins"] += 1
        elif p < 0:
            s["losses"] += 1

    symbols = []
    for sym, s in symbol_stats.items():
        t = s["trades"]
        w = s["wins"]
        wr = (w / t) * 100.0 if t > 0 else 0.0
        symbols.append(
            {
                "symbol": sym,
                "trades": t,
                "profit": round(s["profit"], 2),
                "winrate": wr,
            }
        )

    # Session stats (çok kaba: hour'a göre)
    def session_of_hour(h: int) -> str:
        # Sadece fikir vermek için:
        # Asia: 0-7, London: 7-14, NY: 14-21
        if 0 <= h < 7:
            return "Asia"
        if 7 <= h < 14:
            return "London"
        if 14 <= h < 21:
            return "New York"
        return "Other"

    sessions_map = {}
    hours_map = {}
    weekdays_map = {}

    for d in trades:
        p = float(d.get("profit", 0.0))
        t = d.get("time")
        if isinstance(t, datetime):
            dt = t
        else:
            try:
                dt = datetime.fromtimestamp(t)
            except Exception:
                continue

        # Session
        sess = session_of_hour(dt.hour)
        s = sessions_map.setdefault(
            sess, {"trades": 0, "profit": 0.0, "wins": 0, "losses": 0}
        )
        s["trades"] += 1
        s["profit"] += p
        if p > 0:
            s["wins"] += 1
        elif p < 0:
            s["losses"] += 1

        # Hour-of-day
        h = dt.hour
        hh = hours_map.setdefault(
            h, {"trades": 0, "profit": 0.0, "wins": 0, "losses": 0}
        )
        hh["trades"] += 1
        hh["profit"] += p
        if p > 0:
            hh["wins"] += 1
        elif p < 0:
            hh["losses"] += 1

        # Weekday
        wd = dt.weekday()
        ww = weekdays_map.setdefault(
            wd, {"trades": 0, "profit": 0.0, "wins": 0, "losses": 0}
        )
        ww["trades"] += 1
        ww["profit"] += p
        if p > 0:
            ww["wins"] += 1
        elif p < 0:
            ww["losses"] += 1

    sessions = []
    for sess, s in sessions_map.items():
        t = s["trades"]
        w = s["wins"]
        wr = (w / t) * 100.0 if t > 0 else 0.0
        sessions.append(
            {
                "session": sess,
                "trades": t,
                "profit": round(s["profit"], 2),
                "winrate": wr,
            }
        )

    hours = []
    for h, s in sorted(hours_map.items(), key=lambda kv: kv[0]):
        t = s["trades"]
        w = s["wins"]
        wr = (w / t) * 100.0 if t > 0 else 0.0
        hours.append(
            {
                "hour": h,
                "trades": t,
                "profit": round(s["profit"], 2),
                "winrate": wr,
            }
        )

    weekdays = []
    names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for wd, s in sorted(weekdays_map.items(), key=lambda kv: kv[0]):
        t = s["trades"]
        w = s["wins"]
        wr = (w / t) * 100.0 if t > 0 else 0.0
        weekdays.append(
            {
                "weekday": wd,
                "name": names[wd] if 0 <= wd < len(names) else str(wd),
                "trades": t,
                "profit": round(s["profit"], 2),
                "winrate": wr,
            }
        )

    # Streaks (win/loss)
    longest_win = 0
    longest_loss = 0
    current_win = 0
    current_loss = 0
    for p in profits:
        if p > 0:
            current_win += 1
            current_loss = 0
        elif p < 0:
            current_loss += 1
            current_win = 0
        else:
            current_win = 0
            current_loss = 0
        if current_win > longest_win:
            longest_win = current_win
        if current_loss > longest_loss:
            longest_loss = current_loss

    summary = {
        "totalTrades": total_trades,
        "wins": win_count,
        "losses": loss_count,
        "winrate": winrate,
        "avgWinMoney": avg_win,
        "avgLossMoney": avg_loss,
        "expectancyMoney": expectancy,
        "maxDrawdownMoney": round(max_dd, 2),
        "equityCurve": equity,
        "drawdownCurve": dd_curve,
        "symbols": symbols,
        "sessions": sessions,
        "hours": hours,
        "weekdays": weekdays,
        "longestWinStreak": longest_win,
        "longestLossStreak": longest_loss,
        "useDummy": False,
    }

    return {
        "ok": True,
        "hasData": True,
        "summary": summary,
    }


# -----------------------
# main()
# -----------------------
def main():
    parser = argparse.ArgumentParser(
        description="MT5 data service for Trade Journal (mega summary)"
    )
    subparsers = parser.add_subparsers(dest="command")

    p_sum = subparsers.add_parser("summary", help="Get account performance summary")
    p_sum.add_argument(
        "--from",
        dest="date_from",
        type=str,
        required=False,
        help="Start date YYYY-MM-DD (default: today - 90 days)",
    )
    p_sum.add_argument(
        "--to",
        dest="date_to",
        type=str,
        required=False,
        help="End date YYYY-MM-DD (default: today)",
    )

    args = parser.parse_args()

    if args.command != "summary":
        print(
            json.dumps(
                {"ok": False, "error": "Unsupported or missing command."},
                default=str,
            )
        )
        return

    today = date.today()
    start = iso_date(args.date_from) if args.date_from else (today - timedelta(days=90))
    end = iso_date(args.date_to) if args.date_to else today
    if start > end:
        start, end = end - timedelta(days=30), end

    # MT5 varsa dene, yoksa/düşerse dummy
    use_dummy = False
    if mt5 is None or sys.platform != "win32":
        use_dummy = True
    else:
        ok, err = connect_mt5()
        if not ok:
            use_dummy = True

    if use_dummy:
        result = build_dummy_summary(start, end)
    else:
        result = build_real_summary(start, end)

    print(json.dumps(result, default=str))


if __name__ == "__main__":
    main()
Bu script:

Windows + MT5 + MetaTrader5 paketi varsa → gerçek veriden summary üretir.

Aksi durumda (MacBook dahil) → dummy summary döndürür (ok: true, useDummy: true).

2. Node Helper – mt5Process (gerekirse güncelleme)
Dosya: src/main/mt5Process.ts
Bu dosyayı tamamen şu kodla değiştirin (varsa):

ts
Copy code
// src/main/mt5Process.ts
import { spawn } from "child_process";
import path from "path";

export interface Mt5SummaryParams {
  dateFrom?: string; // "YYYY-MM-DD"
  dateTo?: string;   // "YYYY-MM-DD"
}

export function runMt5Summary(params: Mt5SummaryParams): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "mt5_service.py");
    const pythonCmd = process.platform === "win32" ? "python" : "python3";

    const args = [scriptPath, "summary"];
    if (params.dateFrom) {
      args.push("--from", params.dateFrom);
    }
    if (params.dateTo) {
      args.push("--to", params.dateTo);
    }

    const child = spawn(pythonCmd, args);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (stderr.trim().length > 0) {
        console.error("mt5_service stderr:", stderr);
      }

      if (code !== 0) {
        return reject(new Error(`mt5_service exited with code ${code}`));
      }

      try {
        const json = JSON.parse(stdout);
        resolve(json);
      } catch (err) {
        reject(
          new Error("Failed to parse mt5_service JSON output: " + String(err))
        );
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}
Bu, mevcut mt5:getSummary IPC handler’ının çalıştığı şekilde kalmasını sağlar.

3. Electron Main – IPC Handler (kontrol)
Dosya: src/main/index.ts
Bu dosyada daha önce şuna benzer bir handler olmalı:

ts
Copy code
import { ipcMain } from "electron";
import { runMt5Summary } from "./mt5Process";

// ...

ipcMain.handle(
  "mt5:getSummary",
  async (_event, args: { dateFrom?: string; dateTo?: string }) => {
    try {
      const result = await runMt5Summary({
        dateFrom: args?.dateFrom,
        dateTo: args?.dateTo,
      });
      return result;
    } catch (err: any) {
      return {
        ok: false,
        error: String(err?.message ?? err),
      };
    }
  }
);
Burada değişiklik yok. Sadece mevcut olup olmadığını kontrol edin; varsa bıraktığınız gibi kalsın.

4. Preload – mt5Api (kontrol)
Dosya: src/preload/index.ts
Burada şu blok mutlaka olmalı (yoksa ekleyin):

ts
Copy code
import { contextBridge, ipcRenderer } from "electron";

// ...

contextBridge.exposeInMainWorld("mt5Api", {
  /**
   * Get MT5 performance summary from Python service.
   * dateFrom / dateTo format: "YYYY-MM-DD" (optional)
   */
  getSummary: (params?: { dateFrom?: string; dateTo?: string }) => {
    return ipcRenderer.invoke("mt5:getSummary", params ?? {});
  },
});
5. Global Type Declaration – window.mt5Api
Dosya: src/renderer/src/mt5.d.ts
Bu dosyayı oluşturun veya tamamen şu hale getirin:

ts
Copy code
// src/renderer/src/mt5.d.ts
export {};

declare global {
  interface Window {
    mt5Api: {
      getSummary: (params?: { dateFrom?: string; dateTo?: string }) => Promise<any>;
    };
  }
}
6. Advanced Types – Mega Summary Arayüzleri
Dosya: src/renderer/src/types/advanced.ts
Dosyanın tamamını şu şekilde değiştirin:

ts
Copy code
// src/renderer/src/types/advanced.ts

export interface EquityPoint {
  time: string;    // ISO string
  balance: number; // cumulative profit
  profit: number;  // trade profit
}

export interface DrawdownPoint {
  time: string;     // ISO string
  drawdown: number; // max peak - balance
}

export interface SymbolStat {
  symbol: string;
  trades: number;
  profit: number;
  winrate: number;
}

export interface SessionStat {
  session: string;
  trades: number;
  profit: number;
  winrate: number;
}

export interface HourStat {
  hour: number;     // 0-23
  trades: number;
  profit: number;
  winrate: number;
}

export interface WeekdayStat {
  weekday: number;  // 0 = Monday
  name: string;     // "Mon" ..."Sun"
  trades: number;
  profit: number;
  winrate: number;
}

export interface Mt5Summary {
  totalTrades: number;
  wins: number;
  losses: number;
  winrate: number;
  avgWinMoney: number;
  avgLossMoney: number;
  expectancyMoney: number;
  maxDrawdownMoney: number;

  equityCurve: EquityPoint[];
  drawdownCurve: DrawdownPoint[];

  symbols: SymbolStat[];
  sessions: SessionStat[];
  hours: HourStat[];
  weekdays: WeekdayStat[];

  longestWinStreak: number;
  longestLossStreak: number;

  useDummy?: boolean; // Python'dan gelirse Mac/demo modu
}

export interface Mt5SummaryResponse {
  ok: boolean;
  hasData?: boolean;
  message?: string;
  error?: string;
  summary?: Mt5Summary | null;
  useDummy?: boolean;
}
7. AdvancedAnalysisPage – Mega UI (Dummy Mod Banner Dahil)
Dosya: src/renderer/src/pages/AdvancedAnalysisPage.tsx
Bu dosyanın tamamını aşağıdaki ile değiştirin:

tsx
Copy code
// src/renderer/src/pages/AdvancedAnalysisPage.tsx
import React, { useEffect, useState } from "react";
import type {
  Mt5SummaryResponse,
  Mt5Summary,
  EquityPoint,
  DrawdownPoint,
  SymbolStat,
  SessionStat,
  HourStat,
  WeekdayStat,
} from "../types/advanced";

const todayStr = () => new Date().toISOString().slice(0, 10);

const minusDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

export const AdvancedAnalysisPage: React.FC = () => {
  const [dateFrom, setDateFrom] = useState(minusDays(90));
  const [dateTo, setDateTo] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Mt5SummaryResponse | null>(null);

  useEffect(() => {
    handleFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFetch = async () => {
    if (!window.mt5Api) {
      setError("mt5Api is not available from preload.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = (await window.mt5Api.getSummary({
        dateFrom,
        dateTo,
      })) as Mt5SummaryResponse;
      setResult(resp);
      if (!resp.ok && resp.error) {
        setError(resp.error);
      }
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  const summary: Mt5Summary | null | undefined = result?.summary;
  const isDummy = summary?.useDummy || result?.useDummy;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Advanced Analysis</h1>
        <p className="page-subtitle">
          MT5 account performance overview – live on Windows, dummy on Mac.
        </p>
      </div>

      {/* Date range + fetch */}
      <div
        className="card"
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={styles.fieldCol}>
          <label style={styles.label}>From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.fieldCol}>
          <label style={styles.label}>To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={{ marginLeft: "auto" }}>
          <button
            type="button"
            onClick={handleFetch}
            style={styles.fetchBtn}
            disabled={loading}
          >
            {loading ? "Fetching..." : "Fetch from MT5"}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="card"
          style={{
            marginBottom: 12,
            borderColor: "#FCA5A5",
            color: "#B91C1C",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && !error && !result.ok && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p style={{ color: "var(--text-secondary)" }}>
            Service returned an error.
          </p>
        </div>
      )}

      {result && result.ok && result.hasData === false && (
        <div className="card" style={{ marginBottom: 12 }}>
          <p style={{ color: "var(--text-secondary)" }}>
            No trades found for this range.
          </p>
        </div>
      )}

      {isDummy && (
        <div
          className="card"
          style={{
            marginBottom: 12,
            borderColor: "#BFDBFE",
            background:
              "linear-gradient(90deg, rgba(191,219,254,0.3), rgba(219,234,254,0.1))",
          }}
        >
          <p style={{ fontSize: 13, color: "#1D4ED8" }}>
            You&apos;re currently seeing <strong>dummy demo data</strong> –
            on Windows with MT5 + MetaTrader5 Python package, this panel will
            use your real account history.
          </p>
        </div>
      )}

      {summary && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Top metrics */}
          <div style={styles.metricsRow}>
            <MetricCard label="Total trades" value={summary.totalTrades} />
            <MetricCard
              label="Winrate"
              value={summary.winrate.toFixed(1) + " %"}
            />
            <MetricCard
              label="Expectancy"
              value={summary.expectancyMoney.toFixed(2)}
              hint="Per trade (account currency)"
            />
            <MetricCard
              label="Max Drawdown"
              value={summary.maxDrawdownMoney.toFixed(2)}
            />
            <MetricCard
              label="Avg Win"
              value={summary.avgWinMoney.toFixed(2)}
            />
            <MetricCard
              label="Avg Loss"
              value={summary.avgLossMoney.toFixed(2)}
            />
            <MetricCard
              label="Longest Win Streak"
              value={summary.longestWinStreak}
            />
            <MetricCard
              label="Longest Loss Streak"
              value={summary.longestLossStreak}
            />
          </div>

          {/* Charts row */}
          <div style={styles.chartsRow}>
            <div className="card" style={styles.chartCard}>
              <h3 style={styles.sectionTitle}>Equity Curve</h3>
              <EquityChart points={summary.equityCurve} />
            </div>
            <div className="card" style={styles.chartCard}>
              <h3 style={styles.sectionTitle}>Drawdown Curve</h3>
              <DrawdownChart points={summary.drawdownCurve} />
            </div>
          </div>

          {/* Symbol stats */}
          <div className="card">
            <h3 style={styles.sectionTitle}>By Symbol</h3>
            <SymbolTable symbols={summary.symbols} />
          </div>

          {/* Session + Hour + Weekday */}
          <div style={styles.bottomGrid}>
            <div className="card">
              <h3 style={styles.sectionTitle}>By Session</h3>
              <SessionTable sessions={summary.sessions} />
            </div>
            <div className="card">
              <h3 style={styles.sectionTitle}>By Hour of Day</h3>
              <HourTable hours={summary.hours} />
            </div>
            <div className="card">
              <h3 style={styles.sectionTitle}>By Weekday</h3>
              <WeekdayTable weekdays={summary.weekdays} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: string | number;
  hint?: string;
}> = ({ label, value, hint }) => (
  <div className="card" style={styles.metricCard}>
    <span style={styles.metricLabel}>{label}</span>
    <span style={styles.metricValue}>{value}</span>
    {hint && <span style={styles.metricHint}>{hint}</span>}
  </div>
);

const EquityChart: React.FC<{ points: EquityPoint[] }> = ({ points }) => {
  if (!points || points.length === 0) {
    return <p style={styles.mutedText}>No data.</p>;
  }

  const balances = points.map((p) => p.balance);
  const minB = Math.min(...balances);
  const maxB = Math.max(...balances);
  const range = maxB - minB || 1;

  return (
    <div style={styles.chartContainer}>
      {points.map((p, idx) => {
        const normalized = (p.balance - minB) / range;
        const height = 20 + normalized * 80; // 20% - 100%
        return (
          <div
            key={idx}
            style={{
              ...styles.chartBar,
              height: `${height}%`,
            }}
            title={`${p.time}\nBalance: ${p.balance.toFixed(2)}`}
          />
        );
      })}
    </div>
  );
};

const DrawdownChart: React.FC<{ points: DrawdownPoint[] }> = ({ points }) => {
  if (!points || points.length === 0) {
    return <p style={styles.mutedText}>No data.</p>;
  }

  const dds = points.map((p) => p.drawdown);
  const maxDD = Math.max(...dds);
  const range = maxDD or 1;

  return (
    <div style={styles.chartContainer}>
      {points.map((p, idx) => {
        const normalized = p.drawdown / range;
        const height = normalized * 100;
        return (
          <div
            key={idx}
            style={{
              ...styles.chartBarDD,
              height: `${height}%`,
            }}
            title={`${p.time}\nDrawdown: ${p.drawdown.toFixed(2)}`}
          />
        );
      })}
    </div>
  );
};

const SymbolTable: React.FC<{ symbols: SymbolStat[] }> = ({ symbols }) => {
  if (!symbols || symbols.length === 0) {
    return <p style={styles.mutedText}>No symbol stats.</p>;
  }
  return (
    <table style={styles.table}>
      <thead>
        <tr style={styles.headerRow}>
          <th style={styles.th}>Symbol</th>
          <th style={styles.th}>Trades</th>
          <th style={styles.th}>Profit</th>
          <th style={styles.th}>Winrate</th>
        </tr>
      </thead>
      <tbody>
        {symbols.map((s) => (
          <tr key={s.symbol} style={styles.row}>
            <td style={styles.td}>{s.symbol}</td>
            <td style={styles.td}>{s.trades}</td>
            <td style={styles.td}>{s.profit.toFixed(2)}</td>
            <td style={styles.td}>{s.winrate.toFixed(1)} %</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const SessionTable: React.FC<{ sessions: SessionStat[] }> = ({ sessions }) => {
  if (!sessions || sessions.length === 0) {
    return <p style={styles.mutedText}>No session stats.</p>;
  }
  return (
    <table style={styles.tableSmall}>
      <thead>
        <tr style={styles.headerRow}>
          <th style={styles.th}>Session</th>
          <th style={styles.th}>Trades</th>
          <th style={styles.th}>Profit</th>
          <th style={styles.th}>Winrate</th>
        </tr>
      </thead>
      <tbody>
        {sessions.map((s) => (
          <tr key={s.session} style={styles.row}>
            <td style={styles.td}>{s.session}</td>
            <td style={styles.td}>{s.trades}</td>
            <td style={styles.td}>{s.profit.toFixed(2)}</td>
            <td style={styles.td}>{s.winrate.toFixed(1)} %</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const HourTable: React.FC<{ hours: HourStat[] }> = ({ hours }) => {
  if (!hours || hours.length === 0) {
    return <p style={styles.mutedText}>No hour stats.</p>;
  }
  return (
    <table style={styles.tableSmall}>
      <thead>
        <tr style={styles.headerRow}>
          <th style={styles.th}>Hour</th>
          <th style={styles.th}>Trades</th>
          <th style={styles.th}>Profit</th>
          <th style={styles.th}>Winrate</th>
        </tr>
      </thead>
      <tbody>
        {hours.map((h) => (
          <tr key={h.hour} style={styles.row}>
            <td style={styles.td}>{h.hour}:00</td>
            <td style={styles.td}>{h.trades}</td>
            <td style={styles.td}>{h.profit.toFixed(2)}</td>
            <td style={styles.td}>{h.winrate.toFixed(1)} %</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const WeekdayTable: React.FC<{ weekdays: WeekdayStat[] }> = ({ weekdays }) => {
  if (!weekdays || weekdays.length === 0) {
    return <p style={styles.mutedText}>No weekday stats.</p>;
  }
  return (
    <table style={styles.tableSmall}>
      <thead>
        <tr style={styles.headerRow}>
          <th style={styles.th}>Day</th>
          <th style={styles.th}>Trades</th>
          <th style={styles.th}>Profit</th>
          <th style={styles.th}>Winrate</th>
        </tr>
      </thead>
      <tbody>
        {weekdays.map((w) => (
          <tr key={w.weekday} style={styles.row}>
            <td style={styles.td}>{w.name}</td>
            <td style={styles.td}>{w.trades}</td>
            <td style={styles.td}>{w.profit.toFixed(2)}</td>
            <td style={styles.td}>{w.winrate.toFixed(1)} %</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const styles: Record<string, React.CSSProperties> = {
  fieldCol: {
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
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid var(--border-subtle)",
    fontSize: 13,
    fontFamily: "inherit",
  },
  fetchBtn: {
    backgroundColor: "var(--accent-primary)",
    color: "#ffffff",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
  },
  metricsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 16,
  },
  metricCard: {
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: "var(--text-secondary)",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 700,
  },
  metricHint: {
    fontSize: 11,
    color: "var(--text-secondary)",
  },
  chartsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
  },
  chartCard: {
    padding: "14px 16px",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    marginBottom: 10,
  },
  chartContainer: {
    display: "flex",
    alignItems: "flex-end",
    gap: 2,
    height: 160,
    padding: "8px 0",
  },
  chartBar: {
    flex: 1,
    background:
      "linear-gradient(to top, rgba(37,99,235,0.75), rgba(191,219,254,0.1))",
    borderRadius: 999,
  },
  chartBarDD: {
    flex: 1,
    background:
      "linear-gradient(to top, rgba(248,113,113,0.8), rgba(254,226,226,0.1))",
    borderRadius: 999,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  tableSmall: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
  },
  headerRow: {
    backgroundColor: "#F9FAFB",
    borderBottom: "1px solid var(--border-subtle)",
  },
  th: {
    textAlign: "left",
    padding: "8px 12px",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  row: {
    borderBottom: "1px solid var(--border-subtle)",
  },
  td: {
    padding: "8px 12px",
    color: "var(--text-primary)",
  },
  mutedText: {
    fontSize: 13,
    color: "var(--text-secondary)",
  },
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
};
8. Kullanıcı Notu (Senin İçin)
MacBook’ta:

mt5_service.py otomatik dummy moda geçecek.

/advanced sayfasına gidip “Fetch from MT5” dersen demo datayı göreceksin.

Ekranın üstünde “dummy demo data” uyarısı çıkacak.

Windows + MT5 + Python MetaTrader5 kurulu bir ortamda:

pip install MetaTrader5 yaptıysan,

MT5 terminali açıksa ve hesaba giriş yaptıysan,

Aynı /advanced sayfası gerçek trade geçmişini kullanacak.

Bu spec ile:

Tek kod tabanı ile hem Mac’te demo, hem Windows’ta gerçek analiz görebileceksin.

İleride R-multiple, setup-tag, session-based accuracy, rule-engine gibi şeyleri bu JSON’un üzerine eklemek çok kolay olacak.