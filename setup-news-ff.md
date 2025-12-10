# Trade Journal – FX News Panel (ForexFactory JSON)

Bu spec, uygulamaya bir **News** sayfası ekler ve veriyi doğrudan
ForexFactory’nin JSON feed’inden çeker:

- Kaynak: `https://nfs.faireconomy.media/ff_calendar_thisweek.json`
- Üst bölüm: **Important news (USD + EUR, High impact)**  
- Alt bölüm: **Today – all news**

> Not: Sadece React tarafında `fetch` kullanıyoruz, Electron main /
> preload’e dokunmuyoruz. CORS engeli çıkarsa sonraki adımda backend’e
> taşırız.

---

## 1. Yeni tip tanımı

### File: `src/renderer/src/types/news.ts`

Bu yeni dosyayı oluştur:

```ts
// src/renderer/src/types/news.ts

export type FxImpact = "Low" | "Medium" | "High" | "Holiday" | string;

export interface FxNewsItem {
  title: string;
  country: string; // USD, EUR, GBP...
  date: string;    // ISO string from ForexFactory
  impact: FxImpact;
  forecast: string;
  previous: string;
}
2. Haber paneli bileşeni
File: src/renderer/src/components/NewsPanel.tsx
Bu yeni dosyayı oluştur:

tsx
Copy code
// src/renderer/src/components/NewsPanel.tsx
import React, { useEffect, useState } from "react";
import type { FxNewsItem } from "../types/news";

// FF JSON kaynağı
const FEED_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";

interface NormalizedNewsItem {
  id: string;
  time: string;      // "08:30"
  dateKey: string;   // "YYYY-MM-DD" (local)
  currency: string;  // USD / EUR / ...
  title: string;
  impact: "Low" | "Medium" | "High" | "Holiday" | string;
  forecast?: string;
  previous?: string;
}

function getLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatLocalTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function normalizeItem(raw: FxNewsItem, idx: number): NormalizedNewsItem | null {
  try {
    const dt = new Date(raw.date);
    if (isNaN(dt.getTime())) return null;

    return {
      id: `${raw.country}-${idx}-${raw.title}`,
      time: formatLocalTime(dt),
      dateKey: getLocalDateKey(dt),
      currency: raw.country,
      title: raw.title,
      impact: raw.impact,
      forecast: raw.forecast,
      previous: raw.previous,
    };
  } catch {
    return null;
  }
}

function impactColor(impact: string): string {
  if (impact === "High") return "#DC2626"; // kırmızı
  if (impact === "Medium") return "#F97316"; // turuncu
  if (impact === "Low") return "#9CA3AF"; // gri
  return "#6B7280";
}

export const NewsPanel: React.FC = () => {
  const [items, setItems] = useState<NormalizedNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(FEED_URL);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = (await res.json()) as FxNewsItem[];

        const normalized: NormalizedNewsItem[] = [];
        data.forEach((raw, idx) => {
          const n = normalizeItem(raw, idx);
          if (n) normalized.push(n);
        });

        const todayKey = getLocalDateKey(new Date());
        const todays = normalized.filter((n) => n.dateKey === todayKey);

        if (!cancelled) {
          setItems(todays);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.message
              ? `Could not load news: ${err.message}`
              : "Could not load news."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const important = items.filter(
    (n) =>
      n.impact === "High" &&
      (n.currency === "USD" || n.currency === "EUR")
  );

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h1 className="page-title">News</h1>
        <p className="page-subtitle">
          ForexFactory calendar – today&apos;s macro events
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Loading / error state */}
        {loading && (
          <div className="card" style={{ padding: 16, fontSize: 13 }}>
            Loading today&apos;s news...
          </div>
        )}

        {error && !loading && (
          <div
            className="card"
            style={{ padding: 16, fontSize: 13, color: "var(--color-red)" }}
          >
            {error}
          </div>
        )}

        {/* Important news – USD & EUR, High impact */}
        {!loading && !error && (
          <div className="card" style={{ padding: 16 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 8,
                color: "var(--text-primary)",
              }}
            >
              Important news (USD &amp; EUR)
            </h3>
            {important.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                There are no high impact USD/EUR events today.
              </p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {important.map((n) => (
                  <li
                    key={n.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--text-primary)",
                        }}
                      >
                        {n.time} — {n.currency} — {n.title}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-secondary)",
                        }}
                      >
                        Forecast: {n.forecast || "-"} | Previous:{" "}
                        {n.previous || "-"}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: `1px solid ${impactColor(n.impact)}`,
                        color: impactColor(n.impact),
                      }}
                    >
                      {n.impact}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* All news for today */}
        {!loading && !error && (
          <div className="card" style={{ padding: 16 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 8,
                color: "var(--text-primary)",
              }}
            >
              Today – all news
            </h3>

            {items.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                There are no events today in the ForexFactory calendar feed.
              </p>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      backgroundColor: "#F9FAFB",
                    }}
                  >
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px 8px",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                      }}
                    >
                      Time
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px 8px",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                      }}
                    >
                      Curr.
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px 8px",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                      }}
                    >
                      Event
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px 8px",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                      }}
                    >
                      Impact
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px 8px",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                      }}
                    >
                      Forecast / Prev.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((n) => (
                    <tr
                      key={n.id}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      <td style={{ padding: "6px 8px" }}>{n.time}</td>
                      <td style={{ padding: "6px 8px" }}>{n.currency}</td>
                      <td style={{ padding: "6px 8px" }}>{n.title}</td>
                      <td style={{ padding: "6px 8px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: 999,
                            border: `1px solid ${impactColor(n.impact)}`,
                            color: impactColor(n.impact),
                          }}
                        >
                          {n.impact}
                        </span>
                      </td>
                      <td style={{ padding: "6px 8px", fontSize: 11 }}>
                        {n.forecast || "-"} / {n.previous || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
3. Dashboard’a News panelini ekleme
Burada varsayım: Dashboard şu an haftalık kutular + Today’s focus + Recent
trades gösteriyor. News panelini en alta ekleyeceğiz.

File: src/renderer/src/pages/DashboardPage.tsx
Üst kısma import ekle

Dosyanın en üst kısmındaki import’lara şunu ekle:

ts
Copy code
import { NewsPanel } from "../components/NewsPanel";
JSX içine NewsPanel ekle

DashboardPage bileşeninin return kısmında, en alta yakın bir yere
(yani Recent trades bölümünden sonra) şu bloğu ekle:

tsx
Copy code
      {/* FX News from ForexFactory */}
      <div style={{ marginTop: 32 }}>
        <NewsPanel />
      </div>
Eğer DashboardPage zaten sectionTitle vb. stiller kullanıyorsa,
bu bloğu bunları bozmadan, sadece <div>...</div> olarak eklemen yeterli.

4. İsteğe bağlı: Ayrı bir “News” route’u yapmak
Eğer haberleri ayrı bir sayfa olarak görmek istersen:

4.1. Sidebar’a yeni menü maddesi
File: src/renderer/src/components/Sidebar.tsx
primaryItems dizisine bir eleman daha ekle:

ts
Copy code
const primaryItems: { id: Page; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "morning", label: "Morning Analysis" },
  { id: "today", label: "Today" },
  { id: "calendar", label: "Calendar" },
  { id: "news", label: "News" }, // <-- bunu ekle
];
Page tipine "news" ekle (tanım nerede ise):

ts
Copy code
export type Page =
  | "dashboard"
  | "morning"
  | "today"
  | "calendar"
  | "settings"
  | "news";
4.2. App router’a /news route’u ekle
File: src/renderer/src/App.tsx
Burada wouter kullandığını varsayıyoruz.
Route ve Switch kullanılan yerde yeni bir satır ekle.

Örneğin:

tsx
Copy code
import { Route, Switch } from "wouter";
import { DashboardPage } from "./pages/DashboardPage";
import { MorningAnalysisPage } from "./pages/MorningAnalysisPage";
import { TodayPage } from "./pages/TodayPage";
import { CalendarPage } from "./pages/CalendarPage";
import { SettingsPage } from "./pages/SettingsPage";
// NewsPage diye ayrı bir sayfa yapmak istersen NewsPanel'i orada da kullanabilirsin
import { NewsPanel } from "./components/NewsPanel";
Ve Switch içinde:

tsx
Copy code
<Switch>
  <Route path="/" component={DashboardPage} />
  <Route path="/morning/:date?" component={MorningAnalysisPage} />
  <Route path="/today" component={TodayPage} />
  <Route path="/calendar" component={CalendarPage} />
  <Route path="/settings" component={SettingsPage} />
  <Route path="/news">
    {/* Basit bir NewsPage: aynı paneli burada tam sayfa göster */}
    <div style={{ padding: 24 }}>
      <NewsPanel />
    </div>
  </Route>
</Switch>
Bu adım isteğe bağlı. Sadece Dashboard içine panel eklemen de yeterli.

5. Test Checklist
npm run dev ile uygulamayı başlat.

Dashboard’a git:

“Important news (USD & EUR)” kartında bugünün High impact
USD/EUR haberlerini görmelisin.

Alt kartta “Today – all news” tablosu bugünkü tüm haberleri
ForexFactory’den çekmeli.

Tarih değiştiğinde (yarın) tekrar açtığında, otomatik olarak yeni günün
haberlerini göstermeli.

Her şey yolundaysa artık haber akışın da Trade Journal içinde. 📈📰