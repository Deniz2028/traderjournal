
1) 📁 Backend (main process)
Yeni dosya: src/main/storage/eodReviewStorage.ts
import { app } from "electron";
import path from "path";
import fs from "fs";

export interface EODReview {
  date: string;          // YYYY-MM-DD
  dayDirection: "up" | "down" | "chop" | null;
  tradeSummary: {
    longCount: number;
    shortCount: number;
  };
  realDayBias: string;
  diary: string;
}

const filePath = path.join(app.getPath("userData"), "eod_review.json");

function loadFile(): Record<string, EODReview> {
  try {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function saveFile(data: Record<string, EODReview>) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export const eodStorage = {
  getForDate(date: string): EODReview | null {
    const db = loadFile();
    return db[date] || null;
  },

  saveForDate(date: string, value: EODReview) {
    const db = loadFile();
    db[date] = value;
    saveFile(db);
  },

  getForMonth(yyyyMM: string): EODReview[] {
    const db = loadFile();
    return Object.values(db).filter(r => r.date.startsWith(yyyyMM));
  }
};

IPC route dosyası: src/main/ipc/eodReview.ts
import { ipcMain } from "electron";
import { eodStorage } from "../storage/eodReviewStorage";

ipcMain.handle("eod:getForDate", (_, date) => {
  return eodStorage.getForDate(date);
});

ipcMain.handle("eod:saveForDate", (_, payload) => {
  const { date, data } = payload;
  return eodStorage.saveForDate(date, data);
});

ipcMain.handle("eod:getForMonth", (_, yyyyMM) => {
  return eodStorage.getForMonth(yyyyMM);
});

<br>
2) ⚡ Preload API Güncellemesi

src/preload/index.ts içine eklenir:

contextBridge.exposeInMainWorld("eodApi", {
  getForDate: (date) => ipcRenderer.invoke("eod:getForDate", date),
  saveForDate: (date, data) =>
    ipcRenderer.invoke("eod:saveForDate", { date, data }),
  getForMonth: (yyyyMM) => ipcRenderer.invoke("eod:getForMonth", yyyyMM),
});


Artık renderer tarafında kullanımı:

window.eodApi.getForDate("2025-12-10")
window.eodApi.saveForDate("2025-12-10", {...})

<br>
3) 📝 Yeni Sayfa: End-of-Day Review

Dosya: src/pages/EODReviewPage.tsx

Route: /eod/:date

import { useParams } from "wouter";
import { useEffect, useState } from "react";

export default function EODReviewPage() {
  const { date } = useParams();
  const [form, setForm] = useState({
    dayDirection: null,
    tradeSummary: { longCount: 0, shortCount: 0 },
    realDayBias: "",
    diary: ""
  });

  useEffect(() => {
    window.eodApi.getForDate(date).then((res) => {
      if (res) setForm(res);
    });
  }, [date]);

  function save() {
    window.eodApi.saveForDate(date, { date, ...form });
    alert("Saved!");
  }

  return (
    <div className="page">
      <h1>End of Day Review – {date}</h1>

      <div className="card">
        <h3>Day Direction</h3>
        <div className="row">
          {["up", "down", "chop"].map((dir) => (
            <button
              key={dir}
              className={form.dayDirection === dir ? "activeBtn" : "btn"}
              onClick={() => setForm({ ...form, dayDirection: dir })}
            >
              {dir.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Real Day Bias</h3>
        <textarea
          value={form.realDayBias}
          onChange={(e) => setForm({ ...form, realDayBias: e.target.value })}
        />
      </div>

      <div className="card">
        <h3>Diary / Notes</h3>
        <textarea
          value={form.diary}
          onChange={(e) => setForm({ ...form, diary: e.target.value })}
        />
      </div>

      <button className="saveBtn" onClick={save}>
        Save Review
      </button>
    </div>
  );
}

<br>
4) 📅 Calendar Entegrasyonu
Artık her hücrede EOD olup olmadığı gösterilir.

src/pages/CalendarPage.tsx içinde:

4.1 Ay verisini backend’den çek:
useEffect(() => {
  const ym = `${year}-${String(month + 1).padStart(2, "0")}`;

  window.eodApi.getForMonth(ym).then((res) => {
    const map = {};
    res.forEach(r => map[r.date] = r);
    setEodMap(map);
  });
}, [month, year]);

4.2 Hücrede göster:
{eodMap[cellDate] && (
  <div className="eodTag">
    📘 EOD
  </div>
)}

4.3 Hücreye tıklayınca EOD sayfasına git:
onClick={() => navigate(`/eod/${cellDate}`)}

<br>
✔️ Bu özelliklerle ne kazanıyoruz?
Özellik	Durum
Gün sonu yönü seçimi	✅
İşlem yön özetleri	(otomatik bağlanacak - v2'de)
Real day bias	✅
Diary / Lessons	✅
Calendar'da EOD etiketi	✅
Calendar → EOD sayfası routing	✅
Backend storage	✅