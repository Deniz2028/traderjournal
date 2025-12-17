# Roadmap: Sesli TradingView Alarmları

TradingView alarmlarını sesli olarak okuyan bir sistem kurmak için yol haritası aşağıdadır. Altyapının büyük kısmı zaten hazır durumdadır.

## 1. Mimari (Nasıl Çalışıyor?)

1.  **Tetİkleyici**: TradingView alarmı çalar.
2.  **İletim**: TradingView bir "Webhook" isteği ile veriyi bizim sunucuya (Supabase Edge Function) gönderir.
3.  **Kayıt**: Sunucu bu mesajı veritabanına (`notifications` tablosuna) kaydeder.
4.  **Dinleme**: Senin bilgisayarındaki uygulama (Trade Journal) veritabanını canlı olarak (Realtime) dinler.
5.  **Aksiyon**: Yeni kayıt düştüğü an uygulama bunu yakalar ve **"Text-to-Speech" (Metin Okuma)** motorunu kullanarak sesli okur.

## 2. Mevcut Durum

-   ✅ **Backend**: `tv_webhook` fonksiyonu hazır. Supabase'e gelen veriyi kaydedebiliyor.
-   ✅ **Frontend**: `TvAlertListener.tsx` dosyası hazır. Veritabanına yeni bildirim düştüğünde bunu ekranda "Toast" mesajı olarak gösteriyor.
-   ❌ **Seslendirme**: Şu an sadece görsel bildirim var, ses yok.

## 3. Yapılacak Geliştirmeler (Kod)

Tek yapmamız gereken `TvAlertListener.tsx` dosyasına şu küçük kod bloğunu eklemek:

```typescript
const speakMessage = (text: string) => {
    // Tarayıcının konuşma özelliğini kullan
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR'; // Türkçe konuşması için
    utterance.rate = 1.0; // Normal hız
    window.speechSynthesis.speak(utterance);
};

// Bu fonksiyonu bildirim geldiği anda çağıracağız.
```

## 4. TradingView Kurulumu (Senin Yapman Gereken)

Sistemin çalışması için TradingView'da alarm kurarken şunları yapmalısın:

1.  **Webhook URL**: Supabase Edge Function URL'ini buraya yapıştır (Bunu sana daha sonra vereceğim).
2.  **Mesaj Formatı**: Mesaj kutusuna **JSON** formatında şu veriyi yazmalısın:

```json
{
  "title": "DXY Direnç Kırılımı",
  "message": "DXY 104.5 seviyesini kırdı, Long bakılabilir.",
  "type": "alert"
}
```

Bu kadar! TradingView bu mesajı attığında, senin odanda bilgisayarın "DXY 104.5 seviyesini kırdı, Long bakılabilir" diye bağıracak. :D

## 5. Özet

Altyapı %90 oranında hazır. Sadece `TvAlertListener` dosyasına "konuş" komutunu eklememiz yeterli. İstersen hemen şimdi ekleyebilirim.
