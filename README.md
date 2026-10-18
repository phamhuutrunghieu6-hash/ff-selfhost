# Phtrunghieu008 Control — Free Fire / FF MAX

Telegram: **@hieuphamiosvietnam**

Android + iOS. Key cứng. Domain mặc định: `proxypin.vippdph.store`

## Key

```
phamtrunghieu-vuacrackmenu
```

## Upload static (Cloudflare / hosting file)

Upload **toàn bộ thư mục `public/`** lên root domain.

Đã có sẵn path:
- `/ffproxy/codepatch/assembly-csharp-patch` (game hay request path này)
- `/ffproxy/assembly-csharp-patch.gz`
- `/api/ff-menu/proxypin/config` (rewrite đúng domain)
- `/ff-menu/`

**Lưu ý:** static only → login menu (`/api/ff-menu/auth`) không chạy. Muốn login + lưu feature → chạy Node.

## Chạy Node (đầy đủ auth + API)

```bash
cd server
npm install
export DOMAIN=proxypin.vippdph.store
node server.js
```

Reverse proxy HTTPS → port 3000.

## ProxyPin Android

1. Tải `phtrunghieu-proxypin.json` (trong zip) hoặc  
   `https://proxypin.vippdph.store/api/ff-menu/proxypin/config`
2. Cài + trust CA ProxyPin (Android 7+ cần Magisk AlwaysTrustUserCerts hoặc VPN mode)
3. Script → xóa cũ → Import → bật **FFProxy — Block Garena CDN** + **PHTRUNGHIEU**
4. Start proxy
5. Force stop Free Fire → mở lại
6. History ProxyPin phải thấy `/live` rewrite về `proxypin.vippdph.store`

Menu (khi có Node): `https://proxypin.vippdph.store/ff-menu/` + key ở trên.

## Đổi domain

1. Sửa `phtrunghieu-proxypin.json` + `public/api/ff-menu/proxypin/config`  
   → thay `proxypin.vippdph.store` bằng domain mới
2. `export DOMAIN=domain-moi.com` khi chạy Node
3. Upload lại

