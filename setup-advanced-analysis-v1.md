# Trade Journal – Advanced Analysis v1 (MT5 + Python Service)

Amaç:
- MetaTrader 5 hesabındaki **geçmiş işlemleri** ve **performansını** otomatik çekmek.
- Python + MetaTrader5 kütüphanesi ile JSON üreten küçük bir servis yazmak.
- Electron main process bu servisi çalıştırıp JSON sonucu renderer’a döndürsün.
- Renderer’da `/advanced` (Advanced Analysis) sayfasında:
  - Toplam trade sayısı, winrate, expectancy, max drawdown vb. metrikler
  - Basit bir equity curve grafiği (CSS tabanlı, ekstra npm paketi yok)
  - Sembol bazlı özet tablo

ÖNEMLİ:
- Bu versiyonda **sadece okuma** yapıyoruz (MT5 tarafında işlem açma/yönetme yok).
- Python bağımlılıklarını (MetaTrader5, pandas, vb.) kullanıcı manuel kuracak.
- Bu spec:
  - Yeni Python dosyası ekler
  - Main process’e yeni IPC handler ekler
  - Preload’a güvenli API ekler
  - Renderer’a yeni `AdvancedAnalysisPage` sayfası ekler

Lütfen **yalnızca burada listelenen dosyalara dokunun**.

---

## 0. Varsayımlar

- Proje `npm create electron-vite@latest` (React + TS) ile oluşturulmuş.
- Mevcut backend yapısı (trades, morning analysis vs.) çalışıyor.
- Ana dosya yolları:
  - Electron main: `src/main/index.ts`
  - Preload: `src/preload/index.ts`
  - Renderer root: `src/renderer/src`

---

## 1. Python MT5 Servisi

### Dosya: `mt5_service.py` (proje kök dizini)

Bu dosya, komut satırından çağrılabilen küçük bir servis olacak:

- Komut: `summary` – belirli tarih aralığı için performans özeti üretir.
- Çıktı: `stdout` üzerinden **JSON**.

> NOT: Kullanıcı kendi ortamında `pip install MetaTrader5 pandas` kurmalıdır.

**Dosyanın tamamını şu şekilde oluşturun:**

```python
# mt5_service.py
import sys
import json
import argparse
from datetime import datetime, timedelta

try:
    import MetaTrader5 as mt5
except ImportError:
    mt5 = None


def iso_date(s: str) -> datetime:
    return datetime.strptime(s, "%Y-%m-%d")


def connect_mt5():
    if mt5 is None:
        return False, "MetaTrader5 Python package is not installed. Run: pip install MetaTrader5"
    if not mt5.initialize():
        return False, f"MT5 initialize() failed: {mt5.last_error()}"
    return True, None


def fetch_deals(start: datetime, end: datetime):
    deals = mt5.history_deals_get(start, end)
    if deals is None:
        return []
    return [d._asdict() for d in deals]


def build_summary(start: datetime, end: datetime):
    deals_raw = fetch_deals(start, end)

    # Sadece BUY/SELL type'ları al (deposit, commission vb. dışarı)
    trade_types = {mt5.DEAL_TYPE_BUY, mt5.DEAL_TYPE_SELL}
    trades = [
        d for d in deals_raw
        if d.get("type") in trade_types
    ]

    if not trades:
        return {
            "ok": True,
            "hasData": False,
            "message": "No trades found in this range.",
            "summary": None,
        }

    # Basit metrikler
    total_trades = len(trades)
    profits = [d.get("profit", 0.0) for d in trades]
    wins = [p for p in profits if p > 0]
    losses = [p for p in profits if p < 0]

    win_count = len(wins)
    loss_count = len(losses)
    winrate = (win_count / total_trades) * 100.0 if total_trades > 0 else 0.0

    avg_win = sum(wins) / win_count if win_count > 0 else 0.0
    avg_loss = sum(losses) / loss_count if loss_count > 0 else 0.0

    # Expectancy (para cinsinden – R değil)
    if total_trades > 0 and (win_count > 0 or loss_count > 0):
        p_win = win_count / total_trades
        p_loss = loss_count / total_trades
        expectancy = p_win * avg_win + p_loss * avg_loss
    else:
        expectancy = 0.0

    # Equity curve için tarih sıralı cumulative profit
    sorted_trades = sorted(
        trades,
        key=lambda d: d.get("time", 0)
    )
    equity = []
    balance = 0.0
    for d in sorted_trades:
        profit = d.get("profit", 0.0)
        balance += profit
        t = d.get("time")
        # time alanı datetime ise isoformat'a çevir
        if isinstance(t, datetime):
            t_str = t.isoformat()
        else:
            # mt5._asdict() içinde time timestamp olabiliyor
            try:
                t_str = datetime.fromtimestamp(t).isoformat()
            except Exception:
                t_str = str(t)
        equity.append({
            "time": t_str,
            "balance": balance,
            "profit": profit,
        })

    # Max drawdown (basit)
    peak = -1e18
    max_dd = 0.0
    for point in equity:
        b = point["balance"]
        if b > peak:
            peak = b
        dd = peak - b
        if dd > max_dd:
            max_dd = dd

    # Sembol bazlı özet
    symbol_stats = {}
    for d in trades:
        sym = d.get("symbol", "UNKNOWN")
        p = d.get("profit", 0.0)
        s = symbol_stats.setdefault(sym, {"trades": 0, "profit": 0.0, "wins": 0, "losses": 0})
        s["trades"] += 1
        s["profit"] += p
        if p > 0:
            s["wins"] += 1
        elif p < 0:
            s["losses"] += 1

    symbol_list = []
    for sym, s in symbol_stats.items():
        w = s["wins"]
        t = s["trades"]
        wr = (w / t) * 100.0 if t > 0 else 0.0
        symbol_list.append({
            "symbol": sym,
            "trades": t,
            "profit": s["profit"],
            "winrate": wr,
        })

    summary = {
        "totalTrades": total_trades,
        "wins": win_count,
        "losses": loss_count,
        "winrate": winrate,
        "avgWin": avg_win,
        "avgLoss": avg_loss,
        "expectancy": expectancy,
        "maxDrawdown": max_dd,
        "equityCurve": equity,
        "symbols": symbol_list,
    }

    return {
        "ok": True,
        "hasData": True,
        "summary": summary,
    }


def main():
    parser = argparse.ArgumentParser(description="MT5 data service for Trade Journal")
    subparsers = parser.add_subparsers(dest="command")

    # summary komutu
    p_sum = subparsers.add_parser("summary", help="Get account performance summary")
    p_sum.add_argument("--from", dest="date_from", type=str, required=False,
                       help="Start date YYYY-MM-DD (default: today - 90 days)")
    p_sum.add_argument("--to", dest="date_to", type=str, required=False,
                       help="End date YYYY-MM-DD (default: today)")

    args = parser.parse_args()

    if args.command != "summary":
        # Hatalı / eksik komut
        print(json.dumps({"ok": False, "error": "Unsupported or missing command."}))
        return

    ok, err = connect_mt5()
    if not ok:
        print(json.dumps({"ok": False, "error": err}))
        return

    today = datetime.now().date()
    start = iso_date(args.date_from) if args.date_from else (today - timedelta(days=90))
    end = iso_date(args.date_to) if args.date_to else today

    # date objeleri datetime'a çevir
    if isinstance(start, datetime):
        s_dt = start
    else:
        s_dt = datetime.combine(start, datetime.min.time())
    if isinstance(end, datetime):
        e_dt = end
    else:
        e_dt = datetime.combine(end, datetime.max.time())

    result = build_summary(s_dt, e_dt)
    print(json.dumps(result, default=str))


if __name__ == "__main__":
    main()
2. Node helper – Python sürecini çalıştırma
Dosya: src/main/mt5Process.ts
Bu dosya Python scriptini child_process.spawn ile çalıştıracak ve JSON sonucu döndürecek.

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

    // Windows'ta genelde "python", macOS'ta "python3" kullanıyoruz
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
        reject(new Error("Failed to parse mt5_service JSON output: " + String(err)));
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}
3. Electron main – IPC handler ekle
Dosya: src/main/index.ts
Bu dosyada zaten ipcMain.handle(...) çağrıları var (trades, morning vs. için).
Buraya ek olarak aşağıdaki import ve handler’ı ekleyin.

⚠️ Bu spec, dosyanın tamamını değil sadece ek kısmı tarif ediyor.
Antigravity mevcut index.ts içinde uygun yerlere eklemeli.

Üst kısma import ekle:

ts
Copy code
import { ipcMain } from "electron";
import { runMt5Summary } from "./mt5Process";
(ipcMain muhtemelen zaten import edilmiştir; tekrar import edilmesin, varsa sadece runMt5Summary ekleyin.)

IPC handler ekleyin (diğer ipcMain.handle çağrılarının yanına):

ts
Copy code
ipcMain.handle("mt5:getSummary", async (_event, args: { dateFrom?: string; dateTo?: string }) => {
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
});
4. Preload – mt5Api köprüsü
Dosya: src/preload/index.ts
Bu dosyada daha önce contextBridge.exposeInMainWorld ile çeşitli API’ler verilmiş durumda (trades, morning vs.).

Buraya yeni bir API grubu ekleyeceğiz: window.mt5Api.getSummary().

Üst kısma import ekleyin (eğer yoksa):

ts
Copy code
import { contextBridge, ipcRenderer } from "electron";
Aşağıdaki bloğu uygun exposeInMainWorld çağrılarının yanına ekleyin:

ts
Copy code
contextBridge.exposeInMainWorld("mt5Api", {
  /**
   * Get MT5 performance summary from Python service.
   * dateFrom / dateTo format: "YYYY-MM-DD" (opsiyonel)
   */
  getSummary: (params?: { dateFrom?: string; dateTo?: string }) => {
    return ipcRenderer.invoke("mt5:getSummary", params ?? {});
  },
});
5. Renderer – global type declaration (window.mt5Api)
Dosya: src/renderer/src/mt5.d.ts
Bu dosya TypeScript’e window.mt5Api nesnesinin var olduğunu anlatacak.

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
Vite/TS bu dosyayı otomatik görebilsin diye proje içinde herhangi ekstra import gerekmez (tsconfig include düzgünse). Gerekirse Antigravity tsconfig’e src/renderer/src/**/*.d.ts dahil olduğundan emin olabilir.

6. Advanced Analysis tipi (opsiyonel ama güzel)
Dosya: src/renderer/src/types/advanced.ts
Bu dosya Python JSON’unu daha tipli kullanmamızı sağlar.

ts
Copy code
// src/renderer/src/types/advanced.ts

export interface EquityPoint {
  time: string;    // ISO string
  balance: number; // cumulative profit
  profit: number;  // trade profit
}

export interface SymbolStat {
  symbol: string;
  trades: number;
  profit: number;
  winrate: number;
}

export interface Mt5Summary {
  totalTrades: number;
  wins: number;
  losses: number;
  winrate: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  maxDrawdown: number;
  equityCurve: EquityPoint[];
  symbols: SymbolStat[];
}

export interface Mt5SummaryResponse {
  ok: boolean;
  hasData?: boolean;
  message?: string;
  error?: string;
  summary?: Mt5Summary | null;
}
7. Yeni Sayfa – AdvancedAnalysisPage
Dosya: src/renderer/src/pages/AdvancedAnalysisPage.tsx
Bu sayfa:

Tarih aralığı seçmek için küçük bir form (default: son 90 gün)

“Fetch from MT5” butonu

Üstte metrik kartları

Ortada basit bir equity curve (CSS ile)

Altta symbol bazlı tablo

tsx
Copy code
// src/renderer/src/pages/AdvancedAnalysisPage.tsx
import React, { useEffect, useState } from "react";
import type { Mt5SummaryResponse, Mt5Summary, EquityPoint, SymbolStat } from "../types/advanced";

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

  // İlk açılışta otomatik çekmek istersen, burayı aktif bırak:
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Advanced Analysis</h1>
        <p className="page-subtitle">
          MT5 account performance overview (Python service)
        </p>
      </div>

      {/* Date range + fetch button */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={styles.label}>From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
          style={{ marginBottom: 16, borderColor: "#FCA5A5", color: "#B91C1C" }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && !result.ok && !error && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ color: "var(--text-secondary)" }}>
            Service returned an error.
          </p>
        </div>
      )}

      {result && result.ok && result.hasData === false && (
        <div className="card">
          <p style={{ color: "var(--text-secondary)" }}>
            No trades found for this range.
          </p>
        </div>
      )}

      {summary && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Top metrics */}
          <div style={styles.metricsRow}>
            <MetricCard
              label="Total trades"
              value={summary.totalTrades}
            />
            <MetricCard
              label="Winrate"
              value={summary.winrate.toFixed(1) + " %"}
            />
            <MetricCard
              label="Expectancy"
              value={summary.expectancy.toFixed(2)}
              hint="Per trade (account currency)"
            />
            <MetricCard
              label="Max Drawdown"
              value={summary.maxDrawdown.toFixed(2)}
            />
          </div>

          {/* Equity curve */}
          <div className="card">
            <h3 style={styles.sectionTitle}>Equity Curve</h3>
            <EquityChart points={summary.equityCurve} />
          </div>

          {/* Symbol stats */}
          <div className="card">
            <h3 style={styles.sectionTitle}>By Symbol</h3>
            <SymbolTable symbols={summary.symbols} />
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string | number; hint?: string }> = ({
  label,
  value,
  hint,
}) => (
  <div className="card" style={styles.metricCard}>
    <span style={styles.metricLabel}>{label}</span>
    <span style={styles.metricValue}>{value}</span>
    {hint && <span style={styles.metricHint}>{hint}</span>}
  </div>
);

// Basit CSS tabanlı "area" tarzı equity grafiği
const EquityChart: React.FC<{ points: EquityPoint[] }> = ({ points }) => {
  if (!points || points.length === 0) {
    return <p style={{ color: "var(--text-secondary)" }}>No data.</p>;
  }

  const balances = points.map((p) => p.balance);
  const minB = Math.min(...balances);
  const maxB = Math.max(...balances);
  const range = maxB - minB || 1;

  return (
    <div style={styles.chartContainer}>
      {points.map((p, idx) => {
        const normalized = (p.balance - minB) / range;
        const height = 20 + normalized * 80; // 20px min, 100px max
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

const SymbolTable: React.FC<{ symbols: SymbolStat[] }> = ({ symbols }) => {
  if (!symbols || symbols.length === 0) {
    return <p style={{ color: "var(--text-secondary)" }}>No symbol stats.</p>;
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

const styles: Record<string, React.CSSProperties> = {
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
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 16,
  },
  metricCard: {
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: "var(--text-secondary)",
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 700,
  },
  metricHint: {
    fontSize: 11,
    color: "var(--text-secondary)",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    marginBottom: 12,
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
    background: "linear-gradient(to top, rgba(37,99,235,0.6), rgba(191,219,254,0.1))",
    borderRadius: 999,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  headerRow: {
    backgroundColor: "#F9FAFB",
    borderBottom: "1px solid var(--border-subtle)",
  },
  th: {
    textAlign: "left",
    padding: "10px 16px",
    fontWeight: 600,
    color: "var(--text-secondary)",
  },
  row: {
    borderBottom: "1px solid var(--border-subtle)",
  },
  td: {
    padding: "10px 16px",
    color: "var(--text-primary)",
  },
};
8. AdvancedAnalysisPage’i router’a ve Sidebar’a bağlamak (YOL GÖSTERME)
Bu adım mevcut router / Sidebar yapını tamamen bilmediğim için tam dosya değiştirmiyorum, sadece yapılması gerekeni tarif ediyorum. Antigravity, mevcut koda bakarak uyarlayabilir.

8.1. Sidebar’a yeni menü maddesi ekle
Dosya: src/renderer/src/components/Sidebar.tsx
Menüde Dashboard / Morning / Today / Calendar / Settings gibi elemanlar var.
Bunlara ek olarak:

Advanced veya Advanced Analysis adında yeni bir item ekle.

Tıklayınca /advanced rotasına götürsün.

Örnek (mevcut diziye yeni item):

ts
Copy code
const primaryItems: { id: Page; label: string; href: string }[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard" },
  { id: "morning", label: "Morning Analysis", href: "/morning" },
  { id: "today", label: "Today", href: "/today" },
  { id: "calendar", label: "Calendar", href: "/calendar" },
  { id: "advanced", label: "Advanced", href: "/advanced" },
];
Page union tipine "advanced" eklenmeyi unutmayın.

8.2. Router’a yeni route ekle
Dosya: src/renderer/src/App.tsx veya src/renderer/src/router.tsx
Wouter kullanıyorsanız:

tsx
Copy code
import { Route } from "wouter";
import { AdvancedAnalysisPage } from "./pages/AdvancedAnalysisPage";

// ...
<Route path="/advanced" component={AdvancedAnalysisPage} />
Böylece /advanced adresine gidildiğinde yeni sayfa açılır.

9. Kullanıcıya Not – Python tarafını kurmak
Bu spec kod tarafını hazırlar; ama MT5 bağlantısının gerçekten çalışması için kullanıcı şunları yapmalı:

Python ortamı kur (Windows + macOS):

Python 3.10+ önerilir.

Gerekli paketleri yükle:

bash
Copy code
pip install MetaTrader5 pandas
MetaTrader 5 terminali açık olmalı ve hesapta giriş yapılmış olmalı.

Uygulamayı çalıştır:

bash
Copy code
npm run dev
Sidebar’dan Advanced sayfasına git → Fetch from MT5 butonuna bas.

Her şey doğruysa:

Üstte metrik kartları

Ortada equity curve

Altta symbol bazlı tablo

görünecektir.

Bu spec ile:

MT5 verisi Python servis üzerinden güvenli şekilde Electron’a bağlanıyor.

Uygulama içinden ileri seviye performans analizi yapan temel iskelet kuruluyor.

Sonraki versiyonlarda:

R-multiple hesaplama

Setup-tag bazlı analiz

Time-of-day / session bazlı breakdown

AI yorumları (LLM tabanlı)

kolayca eklenebilir.

End of specification.