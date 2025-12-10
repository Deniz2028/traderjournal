# Trade Journal – Today Journal v1 (Pre / Post Notes, localStorage)

Amaç:
- Today sayfasına, gün bazlı iki not alanı eklemek:
  - Pre-trade plan (işleme girmeden önce)
  - Post-trade review (günün sonunda)
- Notlar localStorage’da tarih bazlı saklanacak.
- Mevcut trade backend / tablo yapısına dokunma.

ÖNEMLİ:
- `package.json`, Electron main/preload veya trade backend koduna dokunma.
- Sadece burada listelenen dosyaları oluştur / güncelle.
- TodayPage içindeki trade tablosu ve trade logic aynen kalsın.

---

## 1. Journal storage helper

### File: `src/renderer/src/utils/journalStorage.ts`

Bu dosya yoksa oluştur, varsa içeriğini tamamen şununla değiştir:

```ts
// src/renderer/src/utils/journalStorage.ts

export interface TodayJournal {
  date: string;      // "YYYY-MM-DD"
  prePlan: string;   // işleme girmeden ÖNCE yazılan not
  postReview: string; // gün sonu değerlendirme
}

const STORAGE_KEY = "tj_today_journal_v1";

function loadAll(): Record<string, TodayJournal> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, TodayJournal>;
    }
    return {};
  } catch {
    return {};
  }
}

function saveAll(map: Record<string, TodayJournal>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/**
 * Verilen tarih için journal kaydını getirir.
 * Kayıt yoksa boş bir obje döner.
 */
export function getJournalForDate(dateISO: string): TodayJournal {
  const all = loadAll();
  const existing = all[dateISO];
  if (existing) return existing;
  return {
    date: dateISO,
    prePlan: "",
    postReview: "",
  };
}

/**
 * Verilen tarih için journal kaydını kısmi olarak günceller.
 */
export function saveJournalForDate(
  dateISO: string,
  patch: Partial<Pick<TodayJournal, "prePlan" | "postReview">>
): TodayJournal {
  const all = loadAll();
  const current = all[dateISO] ?? {
    date: dateISO,
    prePlan: "",
    postReview: "",
  };

  const updated: TodayJournal = {
    ...current,
    ...patch,
    date: dateISO,
  };

  all[dateISO] = updated;
  saveAll(all);
  return updated;
}
2. Today Journal UI bileşeni
File: src/renderer/src/components/TodayJournalPanel.tsx
Bu yeni dosyayı oluştur:

tsx
Copy code
// src/renderer/src/components/TodayJournalPanel.tsx
import React, { useEffect, useState } from "react";
import { getJournalForDate, saveJournalForDate } from "../utils/journalStorage";

export const TodayJournalPanel: React.FC = () => {
  // Bugünün tarihi (YYYY-MM-DD)
  const todayISO = new Date().toISOString().slice(0, 10);

  const [prePlan, setPrePlan] = useState("");
  const [postReview, setPostReview] = useState("");
  const [loadedDate, setLoadedDate] = useState<string | null>(null);

  // İlk açılışta localStorage'dan oku
  useEffect(() => {
    const j = getJournalForDate(todayISO);
    setPrePlan(j.prePlan);
    setPostReview(j.postReview);
    setLoadedDate(todayISO);
  }, [todayISO]);

  const handleSavePre = () => {
    saveJournalForDate(todayISO, { prePlan });
  };

  const handleSavePost = () => {
    saveJournalForDate(todayISO, { postReview });
  };

  // UI basit: tek kart içinde iki blok
  return (
    <div
      className="card"
      style={{
        marginBottom: 24,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 4,
          }}
        >
          {loadedDate ?? todayISO}
        </div>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 4,
            color: "var(--text-primary)",
          }}
        >
          Today&apos;s Journal
        </h2>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-secondary)",
          }}
        >
          Before you trade, write your plan. After you&apos;re done, review the
          day.
        </p>
      </div>

      {/* Pre-trade plan */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Pre-trade plan (before entering trades)
        </div>
        <textarea
          value={prePlan}
          onChange={(e) => setPrePlan(e.target.value)}
          rows={4}
          placeholder="What is today’s bias, setup, and risk plan?"
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: 8,
            border: "1px solid var(--border-subtle)",
            fontSize: 13,
            fontFamily: "inherit",
            resize: "vertical",
            outline: "none",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleSavePre}
            style={{
              backgroundColor: "var(--accent-primary)",
              color: "#FFFFFF",
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Save pre-plan
          </button>
        </div>
      </div>

      {/* Post-trade review */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: 12,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Post-trade review (after session ends)
        </div>
        <textarea
          value={postReview}
          onChange={(e) => setPostReview(e.target.value)}
          rows={4}
          placeholder="Did you follow the plan? What did you learn?"
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: 8,
            border: "1px solid var(--border-subtle)",
            fontSize: 13,
            fontFamily: "inherit",
            resize: "vertical",
            outline: "none",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleSavePost}
            style={{
              backgroundColor: "var(--accent-primary)",
              color: "#FFFFFF",
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Save review
          </button>
        </div>
      </div>
    </div>
  );
};
3. TodayPage’e paneli ekleme
Bu adımda, mevcut TodayPage.tsx içindeki trade tablosunu BOZMADAN,
sadece en üst tarafa TodayJournalPanel ekliyoruz.

File: src/renderer/src/pages/TodayPage.tsx
Imports’a paneli ekle

Dosyanın en üst kısmında React ve diğer import’ların olduğu bölümde,
diğer import’ların yanına şunu ekle:

ts
Copy code
import { TodayJournalPanel } from "../components/TodayJournalPanel";
Not: import path’ı, TodayPage’in şu an bulunduğu konuma göre ayarlanmıştır:
src/renderer/src/pages/TodayPage.tsx

Header altına paneli ekle

TodayPage bileşeninin return bloğu içinde, sayfa başlığının hemen altını bul:

Örneğin şu kısım benzeri olacak (tam metin değişebilir ama mantık aynı):

tsx
Copy code
return (
  <div>
    <div className="page-header">
      <h1 className="page-title">Today</h1>
      <p className="page-subtitle">Today's trades &amp; review</p>
    </div>

    {/* BURADAN SONRASI trade tablosu vs... */}
Bu header bloğunun hemen ALTINA aşağıdaki satırı ekle:

tsx
Copy code
    <TodayJournalPanel />
Yani sonuç şu yapıda olmalı:

tsx
Copy code
return (
  <div>
    <div className="page-header">
      <h1 className="page-title">Today</h1>
      <p className="page-subtitle">Today's trades &amp; review</p>
    </div>

    <TodayJournalPanel />

    {/* mevcut trade tablosu, butonlar, modallar vs. burada kalmaya devam edecek */}
Trade tablosu ile ilgili diğer kodlara dokunma.

4. Beklenen davranış
npm run dev ile uygulamayı çalıştırdıktan sonra:

Today sayfasında:

En üstte Today’s Journal kartı görünecek.

“Pre-trade plan” ve “Post-trade review” alanları olacak.

Yazdığın metinler:

Günün tarihine göre localStorage’da saklanacak.

Sayfayı kapatıp açtığında aynı gün içinde geri gelecek.

Trade tablosu ve backend trade storage eskisi gibi çalışmaya devam edecek.

Bu sürüm sadece journal metinleri için localStorage kullanıyor.
Daha sonra istersen aynı modeli backend (dosya) tarafına da taşıyabiliriz.

yaml
Copy code
