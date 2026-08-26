# 🧠 English Agent PWA

App học tiếng Anh thích ứng theo năng lực, chạy trên iPhone như app thật.
Bộ đề tự động cập nhật mỗi 3 tháng qua GitHub Actions.

## Cấu trúc file

```
english-agent/
├── index.html              ← App chính (PWA)
├── generate-content.js     ← Script sinh bộ đề bằng Claude API
├── data/
│   └── content.json        ← Bộ đề hiện tại (tự động cập nhật)
└── .github/
    └── workflows/
        └── update-content.yml  ← GitHub Actions chạy mỗi 3 tháng
```

---

## Hướng dẫn cài đặt (15 phút)

### Bước 1 — Tạo GitHub repo

1. Vào [github.com](https://github.com) → **New repository**
2. Tên repo: `english-agent`
3. Chọn **Public** (bắt buộc để app fetch được)
4. Nhấn **Create repository**

### Bước 2 — Upload files lên GitHub

Upload 4 file/thư mục sau lên repo:
- `index.html`
- `generate-content.js`
- `data/content.json`
- `.github/workflows/update-content.yml`

Cách upload: vào repo → **Add file** → **Upload files**

> Lưu ý: `.github` là thư mục ẩn, cần upload qua GitHub CLI hoặc kéo thả cả thư mục.

### Bước 3 — Thêm API key vào GitHub Secrets

1. Vào repo → **Settings** → **Secrets and variables** → **Actions**
2. Nhấn **New repository secret**
3. Name: `ANTHROPIC_API_KEY`
4. Value: paste API key Anthropic của bạn
5. Nhấn **Add secret**

### Bước 4 — Bật GitHub Pages (để host app)

1. Vào repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / `/ (root)`
4. Nhấn **Save**
5. Sau ~2 phút, app sẽ live tại: `https://[username].github.io/english-agent`

### Bước 5 — Cài lên iPhone

1. Mở Safari trên iPhone
2. Vào địa chỉ: `https://[username].github.io/english-agent`
3. Nhấn nút **Share** (ô vuông + mũi tên lên)
4. Chọn **"Add to Home Screen"**
5. Nhấn **Add**
6. Mở app từ màn hình chính → nhập API key → học thôi!

---

## Tự động cập nhật bộ đề

GitHub Actions sẽ tự chạy vào **ngày 1 tháng 1, 4, 7, 10** mỗi năm:
- Gọi Claude API sinh 60 từ vựng + 45 câu hỏi ngữ pháp mới
- Commit file `data/content.json` lên repo
- App tự fetch khi mở → cập nhật tức thì

Chi phí mỗi lần cập nhật: **~$0.01** (Haiku model)

Để chạy thủ công: vào repo → **Actions** → **Update English Content** → **Run workflow**

---

## Chi phí tổng

| Thứ | Chi phí |
|-----|---------|
| GitHub repo + Actions | **Miễn phí** |
| GitHub Pages hosting | **Miễn phí** |
| Claude API (học hàng ngày) | ~$1-3/tháng |
| Claude API (cập nhật bộ đề) | ~$0.04/năm |
| **Tổng** | **~$1-3/tháng** |
