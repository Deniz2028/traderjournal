# Trade Journal - Uygulamayı .exe Olarak Paketleme (.exe Build Guide)

Uygulamanızı Windows (`.exe`) formatında çıktı almak için aşağıdaki adımları izleyebilirsiniz.

> **Not:** macOS kullanıyorsunuz. macOS üzerinden Windows `.exe` dosyası oluşturmak mümkündür ancak bazen ikonlar veya özel imzalar için Windows makinede derleme yapmak daha sağlıklı sonuç verir. Yine de aşağıdaki yöntemle `setup.exe` alabilirsiniz.

---

## 1. Hazırlık (package.json Ayarları)

`package.json` dosyanızda `electron-builder` ayarlarının olduğundan emin olun. Şu anki projenizde temel ayarlar eksik olabilir.

`package.json` dosyasını açın ve en alt parantezden (`}`) önce şu bloğu ekleyin:

```json
  "build": {
    "appId": "com.tradejournal.app",
    "productName": "Trade Journal",
    "directories": {
      "output": "dist"
    },
    "files": [
      "out/**/*",
      "package.json"
    ],
    "mac": {
      "target": "dmg"
    },
    "win": {
      "target": "nsis",
      "icon": "resources/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true
    }
  }
```

*Not: Eğer projenizde ikon dosyası yoksa `icon` satırını silebilirsiniz, varsayılan Electron ikonu kullanılır.*

---

## 2. Derleme (Build) Komutu

Terminalde şu komutları sırasıyla çalıştırın:

### Adım 1: Projeyi Derle (Compile)
Önce TypeScript ve Vite derlemesini yapın:
```bash
npm run build
```
*(Bu komut `out/` klasörüne gerekli dosyaları hazırlar, henüz .exe oluşturmaz.)*

### Adım 2: Paketle (Package)
Şimdi `.exe` dosyasını oluşturmak için:

```bash
npx electron-builder build --win
```

Bu işlem bittiğinde projenizin ana dizininde **`dist`** klasörü oluşacak. İçinde:
- `Trade Journal Setup 1.1.14.exe` (Kurulum dosyası)
- `win-unpacked` (Kuruluma gerek kalmadan çalışan klasör versiyonu)
bulacaksınız.

---

## 3. Önemli İpuçları

1.  **Versiyonlama:** Yeni bir çıktı almadan önce `package.json` içindeki `"version": "1.1.14"` kısmını artırmayı unutmayın (örn. `1.1.15`).
2.  **Yedekleme:** `dist` klasörü build sırasında silinip yeniden oluşturulur, önemli dosyaları burada saklamayın.
3.  **Hata Alırsanız:** macOS üzerinde Windows build alırken bazen "Wine" hatası alabilirsiniz. Bu durumda en temiz yöntem, proje dosyalarını bir Windows bilgisayara kopyalayıp orada `npm install` ve `npm run build` ardından `npx electron-builder build --win` yapmaktır.
