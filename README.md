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

- Đăng ký / đăng nhập
- Xem danh sách trận đấu và đội
- Dự đoán kết quả trận đấu
- Dự đoán nhà vô địch giải đấu
- Bảng xếp hạng điểm số
- Xem dự đoán tỉ số của mọi người theo từng trận và kết quả đúng/sai sau khi trận đấu kết thúc

## API dự đoán theo trận

`GET /api/matches/{match}/predictions?page=1&per_page=50` là API công khai, trả về tên người dự đoán, tỉ số đã chọn, trạng thái đúng/sai và điểm nhận được. Email người dùng không được trả về. `per_page` nhận giá trị từ 1 đến 100.

Phản hồi thành công (`200 OK`):

```json
{
  "data": [
    {
      "id": 15,
      "user": { "id": 8, "name": "Hậu Ngô" },
      "predicted_home_score": 2,
      "predicted_away_score": 1,
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
