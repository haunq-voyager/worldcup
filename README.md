# World Cup 2026 Predictor

Ứng dụng dự đoán kết quả World Cup 2026. Backend Laravel 11, Frontend Next.js 14, Database PostgreSQL.

## Yêu cầu

- Docker & Docker Compose **hoặc** PHP 8.2+, Composer, Node.js 18+, PostgreSQL 16

---

## Cách 1: Chạy bằng Docker (khuyến nghị)

```bash
git clone https://github.com/qhau15/worldcup.git
cd worldcup
docker compose up -d --build
```

Sau khi các container khởi động (~1-2 phút):

```bash
# Chạy migration và seed dữ liệu
docker exec worldcup_backend php artisan migrate --seed
```

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:3000      |
| Backend  | http://localhost:8000/api  |
| Database | localhost:5432             |

---

## Cách 2: Chạy thủ công (không dùng Docker)

### Yêu cầu

- PHP 8.2+, Composer
- Node.js 18+, npm
- PostgreSQL 16 đang chạy

### 1. Clone repo

```bash
git clone https://github.com/qhau15/worldcup.git
cd worldcup
```

### 2. Setup Backend

```bash
cd backend

# Cài dependencies
composer install

# Tạo file .env
cp .env.example .env

# Sửa thông tin database trong .env
# DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD

# Cấu hình Google Identity Services
# GOOGLE_CLIENT_ID, GOOGLE_ALLOWED_DOMAIN

# Generate app key
php artisan key:generate

# Chạy migration và seed
php artisan migrate --seed

# Khởi động server
php artisan serve
```

Backend chạy tại: http://localhost:8000

### 3. Setup Frontend

Mở terminal mới:

```bash
cd frontend

# Cài dependencies
npm install

# Tạo file .env.local
cp .env.local.example .env.local

# Khởi động dev server
npm run dev
```

Frontend chạy tại: http://localhost:3000

---

## Cấu trúc project

```
worldcup/
├── backend/          # Laravel 11 API
│   ├── app/
│   ├── database/
│   └── routes/api.php
├── frontend/         # Next.js 14
│   └── src/
│       ├── app/
│       ├── components/
│       └── lib/
└── docker-compose.yml
```

## Tính năng

- Đăng nhập bằng Google Workspace `@voyager-hcm.com`
- Xem danh sách trận đấu và đội
- Dự đoán kết quả trận đấu
- Dự đoán nhà vô địch giải đấu
- Bảng xếp hạng điểm số
- Đổi ảnh đại diện cá nhân
- Xem dự đoán tỉ số của mọi người theo từng trận và kết quả đúng/sai sau khi trận đấu kết thúc

## Quyền quản trị

Các email `khanh@voyager-hcm.com`, `hoadp@voyager-hcm.com` và `haunq@voyager-hcm.com` được cấp quyền admin. Tài khoản có sẵn được cập nhật trực tiếp; email trong allowlist tự nhận quyền khi đăng nhập Google.

## Đăng nhập Google Workspace

Ứng dụng không còn endpoint đăng ký hoặc đăng nhập bằng mật khẩu. Frontend sử dụng Google Identity Services với origin production `https://worldcup.voyager-hcm.com`; Google Cloud OAuth Client phải khai báo chính xác origin này trong **Authorized JavaScript origins**.

Frontend gửi Google ID token đến:

`POST /api/auth/google`

```json
{
  "credential": "google-id-token"
}
```

Backend xác minh chữ ký, audience, email verified và hosted domain `voyager-hcm.com`. Tài khoản cũ được liên kết theo email để giữ nguyên dự đoán/vcoins; tài khoản mới được tạo tự động. Thành công trả `200` với `user` và Sanctum `token`; credential sai domain hoặc không hợp lệ trả `422`; vượt 10 lần/phút trả `429`.

## API ảnh đại diện

`POST /api/me/avatar` yêu cầu Bearer token và body `multipart/form-data` với trường `avatar`. Hỗ trợ JPEG, PNG, WebP; dung lượng tối đa 2MB và kích thước tối đa 2000x2000 pixel. Thành công trả về user đã cập nhật cùng trường `avatar_url` (`200 OK`); chưa đăng nhập trả `401`, dữ liệu ảnh không hợp lệ trả `422`, vượt 10 lần/phút trả `429`.

Ví dụ phản hồi thành công:

```json
{
  "id": 8,
  "name": "Hậu Ngô",
  "email": "hau@voyager-hcm.com",
  "avatar_url": "http://localhost:8000/storage/avatars/example.webp"
}
```

## Cập nhật dữ liệu World Cup

Dữ liệu không chạy theo lịch tự động và F5 chỉ đọc dữ liệu hiện có trong database. Tài khoản admin dùng nút **Cập nhật lịch, tỷ số & odds** để gọi `POST /api/admin/sync-world-cup-data`. Endpoint yêu cầu Bearer token của admin, giới hạn 1 lần/phút và chạy tuần tự:

1. `worldcup:sync`: cập nhật lịch thi đấu, trạng thái và tỷ số từ football-data.org.
2. `worldcup:sync-odds`: chỉ chạy khi bước 1 thành công, cập nhật kèo 1X2, kèo chấp và tài/xỉu từ The Odds API.

Phản hồi thành công (`200 OK`):

```json
{
  "message": "Cập nhật lịch thi đấu, tỷ số và odds thành công.",
  "data": {
    "matches": "[worldcup:sync] Done — 0 created, 72 updated, 32 skipped.",
    "odds": "[worldcup:sync-odds] Done — 30 matched, 0 skipped."
  }
}
```

Endpoint có thể trả `401` khi chưa đăng nhập, `403` khi không phải admin, `409` khi một lần đồng bộ khác đang chạy, `429` khi vượt giới hạn gọi và `502` khi API dữ liệu bên ngoài thất bại.

## API dự đoán theo trận

`POST /api/predictions` yêu cầu đăng nhập và nhận `match_id`, `predicted_home_score`, `predicted_away_score`, cùng `trash_talk` tùy chọn (chuỗi tối đa 280 ký tự). Gửi lại dự đoán trước giờ bóng lăn sẽ cập nhật cả tỉ số và trash talk.

`GET /api/matches/{match}/predictions?page=1&per_page=50` là API công khai, trả về tên người dự đoán, tỉ số đã chọn, trash talk, trạng thái đúng/sai và điểm nhận được. Email người dùng không được trả về. `per_page` nhận giá trị từ 1 đến 100.

Phản hồi thành công (`200 OK`):

```json
{
  "data": [
    {
      "id": 15,
      "user": {
        "id": 8,
        "name": "Hậu Ngô",
        "avatar_url": "http://localhost:8000/storage/avatars/example.webp"
      },
      "predicted_home_score": 2,
      "predicted_away_score": 1,
      "trash_talk": "Kèo này Argentina thắng nhẹ!",
      "is_correct": true,
      "points_earned": 20,
      "created_at": "2026-06-22T07:00:00.000000Z"
    }
  ],
  "meta": { "current_page": 1, "last_page": 1, "per_page": 50, "total": 1 },
  "summary": { "total": 1, "correct": 1, "wrong": 0, "pending": 0 }
}
```

Nếu `page` hoặc `per_page` không hợp lệ, API trả `422`; nếu trận đấu không tồn tại, API trả `404`.
