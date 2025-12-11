# Trade Journal – Trade Rules Page v1

Amaç:
- Sol menüde (Sidebar) Dashboard / Calendar gibi **ayrı bir “Rules” sayfası** olsun.
- Bu sayfada:
  - Trade kurallarını madde madde yazacaksın.
  - Her kuralın aktif/pasif (On/Off) durumu olacak.
- Veriler **localStorage**'da saklanacak.
- **EOD ile “kurallara uyum” entegrasyonu bu versiyonda YOK**, v2’de yapılacak.
- Electron main / preload / backend dosyalarına DOKUNMA.

Sadece burada listelenen dosyaları oluştur / güncelle.

---

## 1. Tipler – `TradeRule`

### File: `src/renderer/src/types/tradeRules.ts`

Bu dosya yoksa oluştur, varsa İÇERİĞİNİ TAMAMEN değiştir:

```ts
// src/renderer/src/types/tradeRules.ts

export interface TradeRule {
  id: string;        // örn. timestamp veya uuid
  text: string;      // Kural metni (örn. "Max 1R per trade")
  isActive: boolean; // EOD checklist'te kullanılacak mı? (v2'de)
}
2. Storage helper – tradeRulesStorage
File: src/renderer/src/utils/tradeRulesStorage.ts
Bu dosya yoksa oluştur, varsa İÇERİĞİNİ TAMAMEN değiştir:

ts
Copy code
// src/renderer/src/utils/tradeRulesStorage.ts
import type { TradeRule } from "../types/tradeRules";

const STORAGE_KEY = "tj_trade_rules_v1";

function safeParse(raw: string | null): TradeRule[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as TradeRule[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function loadTradeRules(): TradeRule[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return safeParse(raw);
}

export function saveTradeRules(list: TradeRule[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function addTradeRule(text: string): TradeRule[] {
  const trimmed = text.trim();
  if (!trimmed) return loadTradeRules();

  const all = loadTradeRules();
  const now = Date.now();

  const newRule: TradeRule = {
    id: String(now),
    text: trimmed,
    isActive: true,
  };

  const next = [...all, newRule];
  saveTradeRules(next);
  return next;
}

export function removeTradeRule(id: string): TradeRule[] {
  const all = loadTradeRules();
  const next = all.filter((r) => r.id !== id);
  saveTradeRules(next);
  return next;
}

export function toggleTradeRule(id: string): TradeRule[] {
  const all = loadTradeRules();
  const next = all.map((r) =>
    r.id === id ? { ...r, isActive: !r.isActive } : r
  );
  saveTradeRules(next);
  return next;
}
3. Yeni sayfa – RulesPage
Bu sayfa sol menüden açılacak, kuralları yönetmek için tek ekran.

File: src/renderer/src/pages/RulesPage.tsx
Yeni dosya oluştur, İÇERİĞİ:

tsx
Copy code
// src/renderer/src/pages/RulesPage.tsx
import React from "react";
import type { TradeRule } from "../types/tradeRules";
import {
  loadTradeRules,
  addTradeRule,
  removeTradeRule,
  toggleTradeRule,
} from "../utils/tradeRulesStorage";

export const RulesPage: React.FC = () => {
  const [rules, setRules] = React.useState<TradeRule[]>([]);
  const [newRule, setNewRule] = React.useState("");

  React.useEffect(() => {
    setRules(loadTradeRules());
  }, []);

  const handleAdd = () => {
    const next = addTradeRule(newRule);
    setRules(next);
    setNewRule("");
  };

  const handleRemove = (id: string) => {
    const next = removeTradeRule(id);
    setRules(next);
  };

  const handleToggle = (id: string) => {
    const next = toggleTradeRule(id);
    setRules(next);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const hasRules = rules.length > 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Trade Rules</h1>
        <p className="page-subtitle">
          Define and maintain your core trading rules. Later we can connect
          these to your EOD review.
        </p>
      </div>

      {/* Kural ekleme alanı */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          padding: "16px 18px",
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <input
          style={{
            flex: 1,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid var(--border-subtle)",
            fontSize: 13,
            fontFamily: "inherit",
            outline: "none",
          }}
          placeholder='Example: "Max 1R per trade", "No trades during red news"...'
          value={newRule}
          onChange={(e) => setNewRule(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newRule.trim()}
          style={{
            backgroundColor: "var(--accent-primary)",
            color: "#ffffff",
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            border: "none",
            cursor: newRule.trim() ? "pointer" : "not-allowed",
            opacity: newRule.trim() ? 1 : 0.6,
          }}
        >
          + Add rule
        </button>
      </div>

      {/* Kural listesi */}
      <div className="card" style={{ padding: 0 }}>
        {hasRules ? (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Active</th>
                <th style={thStyle}>Rule</th>
                <th style={{ ...thStyle, width: 90 }}></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td style={tdStyle}>
                    <label
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={rule.isActive}
                        onChange={() => handleToggle(rule.id)}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-secondary)",
                        }}
                      >
                        {rule.isActive ? "On" : "Off"}
                      </span>
                    </label>
                  </td>
                  <td style={tdStyle}>{rule.text}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => handleRemove(rule.id)}
                      style={{
                        backgroundColor: "transparent",
                        border: "none",
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: "14px 16px" }}>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              You don&apos;t have any rules yet. Add your core trading rules
              above. In a future version, we can use them as a checklist in your
              end-of-day review.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 14px",
  borderBottom: "1px solid var(--border-subtle)",
  color: "var(--text-secondary)",
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderBottom: "1px solid var(--border-subtle)",
};
4. Sidebar’a “Rules” menüsü ekle
Bu adım, projenin mevcut Sidebar.tsx yapısına göre küçük farklılık gösterebilir.
Ajan, aşağıdaki mantığı koruyarak uyarlasın.

File: src/renderer/src/components/Sidebar.tsx
Sidebar’da Dashboard / Morning / Today / Calendar / News / Settings gibi itemler var.

Bunların arasında, Settings’ten önce şu tarzda bir item daha ekle:

Eğer wouter <Link> kullanıyorsa, nav içine şuna benzer bir buton ekle:

tsx
Copy code
{/* Rules */}
<Link href="/rules">
  <button
    style={{
      ...styles.navItem,
      ...(isActive("/rules") ? styles.navItemActive : {}),
    }}
  >
    Rules
  </button>
</Link>
Not: Projede hali hazırda kullanılan aktiflik kontrol fonksiyonu (örneğin isActive(path)) ne ise, /rules için de onu kullanın.
Eğer Sidebar hâlâ kendi currentPage state’i ile çalışıyorsa, diğer item’ler nasıl eklenmişse aynı pattern ile Rules ekleyin:

enum / union’a "rules" ekle

menuItems listesine { id: "rules", label: "Rules" } ekle

onClick’te onNavigate("rules")

5. Router’a /rules route’u ekle
File: src/renderer/src/App.tsx
Bu projede wouter kullanıldığını varsayıyoruz (daha önceki refaktörden).
Ajan, aşağıdaki adımları uygulasın:

Üst kısma import ekle:

ts
Copy code
import { RulesPage } from "./pages/RulesPage";
Router tanımlarında (dashboard, today, calendar vs. nerede tanımlanıyorsa) aynı stil ile yeni bir route ekle:

Örneğin eğer şöyleyse:

tsx
Copy code
<Switch>
  <Route path="/dashboard">
    <DashboardPage />
  </Route>

  <Route path="/settings">
    <SettingsPage />
  </Route>

  {/* ...diğerleri... */}
</Switch>
Altına şunu ekle:

tsx
Copy code
  <Route path="/rules">
    <RulesPage />
  </Route>
Eğer App, <Route path="/rules" component={RulesPage} /> şeklinde component prop kullanıyorsa, diğer Route’lara nasıl yazıldıysa birebir aynı desenle ekleyin.

6. Beklenen Sonuç
Sol menüde (Sidebar) yeni bir item göreceksin: Rules

Tıklayınca /rules route’una gidecek ve yeni sayfa açılacak.

Bu sayfada:

Input + “+ Add rule” butonu ile yeni kural ekleyebileceksin.

Aşağıda tabloda:

Active checkbox (On/Off)

Rule metni

Remove butonu

Tüm kurallar localStorage’da tj_trade_rules_v1 key’i ile saklanacak ve uygulamayı kapatıp açınca geri gelecek.

EOD entegrasyonu için hiçbir şey bozulmadı; bu sadece temel kural yönetim ekranı (v1).

END OF SPEC