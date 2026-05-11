# 114-2 建中高一第二次定考線上練習網站

這是一個純靜態網站，可部署到 GitHub Pages、Netlify、Cloudflare Pages 或任意靜態主機。

## 檔案

- `index.html`
- `styles.css`
- `app.js`
- `exam-data.js`
- `.nojekyll`
- `netlify.toml`

## 部署方式

### GitHub Pages

1. 建立一個新的 GitHub repository。
2. 上傳本資料夾內所有檔案。
3. 到 repository 的 Settings → Pages。
4. Source 選擇 `Deploy from a branch`，branch 選 `main`，資料夾選 `/root`。
5. 儲存後等待 GitHub 產生網址。

### Netlify

1. 到 Netlify 新增網站。
2. 選擇手動上傳或連接 Git repository。
3. 若手動上傳，直接上傳本資料夾或壓縮檔。
4. Publish directory 使用 `.`。

### Cloudflare Pages

1. 建立 Pages 專案。
2. 上傳本資料夾或連接 Git repository。
3. Build command 留空。
4. Output directory 使用 `.`。

## 注意

本系統使用瀏覽器本機儲存作答紀錄，不會把學生作答送到伺服器。
