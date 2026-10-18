# Dự án bersious.io.vn

## Bối cảnh

User (Thiện Nhân) mua tên miền `bersious.io.vn` (iNET, ~33k/năm) để dùng làm **"bảo tàng" trưng bày sản phẩm cá nhân** lâu dài. Trước mắt dùng làm quà tặng 20/10 (trang web kỷ niệm + thư tay + ảnh cho bạn gái). Sau đó mở rộng thành portfolio / dự án cá nhân.

**Tên miền:** `bersious.io.vn` (đuôi `.io.vn` hợp với handle `bersious` + brand công nghệ).
**Handle:** `bersious` (GitHub, profile cá nhân).

## Hạ tầng đã setup (2026-10-18)

### 1. Tên miền (iNET)
- Đăng ký gói: **Chưa cần web** + **OneSite Free** (0đ) + bỏ chọn email theo tên miền (tránh xung đột DNS).
- Hết hạn: **18/10/2027** (còn 365 ngày).
- Bản ghi DNS (sau khi sửa):
  - `@` (A) → `76.76.21.21` (Vercel IP), Bảo vệ: **TẮT**
  - `www` (CNAME) → `cname.vercel-dns.com`, Bảo vệ: **TẮT**
  - Đã xóa bản ghi OneSite (`192.0.2.1`) và chuyển IP Vercel thành bản ghi Chính (không còn Dự phòng).

### 2. GitHub repo
- URL: `https://github.com/bersious/bersious-web`
- Public, default branch: `main`
- Tự push code qua `gh repo create` + `git push`.
- Có `README.md` mô tả dự án.

### 3. Vercel
- Project: `bersious-web`
- Tạo + deploy + add domain + verify bằng **Vercel CLI** (login GitHub OAuth).
- Production URL: `https://bersious-web.vercel.app`
- Domain: `bersious.io.vn` + `www.bersious.io.vn` đã add vào project.
- Gói: Hobby (Free, có thể nâng cấp bằng thẻ Visa ảo nếu cần).
- **Auto-deploy:** push `main` → Vercel tự build + deploy trong 5-10s.

### 4. Phong cách thiết kế
**Chốt: Minimalist Dark / Cyber-Aesthetic** (hợp với `bersious` handle + đuôi `.io.vn`).
- Nền tối (`#090a0f`) + glow blur xanh lơ (`#38bdf8`).
- Glassmorphism card (backdrop-blur + border trắng mờ).
- Font: Plus Jakarta Sans (UI) + JetBrains Mono (code/badge).
- Hiệu ứng pulse dot + gradient text cho tiêu đề.
- Nội dung hiện tại: trang "under construction" với system online badge, 3 dòng note (1 dòng gợi ý 20/10).

## Workflow cập nhật (đã setup vĩnh viễn)

**Bước 1:** Sửa file `C:\Users\nguye\bersious-web\index.html` (hoặc mở từ Desktop nếu đã copy ra).

**Bước 2:** Commit + push:
```bash
cd ~/bersious-web
git add index.html
git commit -m "..."
git push origin main
```

**Bước 3:** Vercel tự động deploy trong 5-10 giây. User truy cập `bersious.io.vn` thấy nội dung mới luôn.

**Quan trọng:**
- Đổi nội dung (HTML/CSS/JS) → cập nhật trong vài giây, không phải đợi DNS.
- Đổi bản ghi DNS → chỉ làm 1 lần duy nhất khi mới setup (đã xong).
- Lần sau nếu user hỏi "cập nhật web phải đợi lâu không" → trả lời: nội dung cập nhật 5-10s, DNS chỉ đợi khi đổi nhà cung cấp.

## Bài học / lưu ý kỹ thuật

1. **DNS propagation lag:** Tên miền `.io.vn` mới mua mất 1-2h (có khi 24h) để DNS cập nhật toàn cầu. Trong thời gian này, truy cập `bersious.io.vn` có thể ra trang kế toán mẫu của iNET → **cảnh báo user trước để khỏi hoang mang**. Cách test nhanh: tab ẩn danh (`Ctrl+Shift+N`) hoặc `https://bersious-web.vercel.app`.

2. **Bảo vệ (OneShield):** PHẢI tắt tính năng "Bảo vệ" / proxy trên cả bản ghi A và CNAME, nếu không Vercel không verify được domain và không cấp HTTPS.

3. **Bản ghi cũ vs bản ghi mới:** Khi iNET tự tạo bản ghi OneSite mặc định, phải xóa/sửa chứ không thêm bản ghi mới → gây xung đột (1 bản ghi trỏ OneSite, 1 bản ghi trỏ Vercel).

4. **Repo public an toàn:** Vì web tĩnh không chứa mật khẩu / API key / ảnh nhạy cản. Nếu sau này có backend hoặc secret, dùng biến môi trường Vercel + repo private.

5. **File bàn giao cho user:** Mọi file code (HTML/CSS/JS) khi tạo xong phải **copy ra Desktop** `C:\Users\nguye\Desktop\` để user double-click mở xem nhanh, không phải mò File Explorer.

## Kế hoạch tiếp theo (backlog)

- [ ] Trang quà tặng 20/10 riêng (cần hỏi user: ảnh kỷ niệm + lời chúc + bài hát + tên/bí danh bạn gái).
- [ ] Trang chính `bersious.io.vn` mở rộng thành portfolio (khi user yêu cầu).
- [ ] Backup repo ra `D:\OpenClaw Saved\products\bersious-web-v1.0\` khi user muốn.

## Lịch sử thay đổi

- **2026-10-18:** Mua domain `bersious.io.vn` (iNET). Setup GitHub repo + Vercel project. Deploy trang under construction. Trỏ DNS về Vercel. Viết README.
