# 🚗 Car Recommendation System - Complete Setup Guide

## 📋 Yêu cầu hệ thống

- **Docker** & **Docker Compose** (phiên bản mới nhất)
- **Python 3.8+** (để chạy script load data)
- **8GB RAM** trở lên (khuyến nghị)
- **10GB dung lượng trống**

## 🚀 Cài đặt nhanh (1 lệnh)

```bash
chmod +x setup.sh && ./setup.sh
```

Script sẽ tự động:
1. ✅ Kiểm tra Docker đã cài đặt chưa
2. ✅ Cài đặt Python dependencies (pandas, psycopg2-binary)
3. ✅ Khởi động PostgreSQL, PostgREST, Bytebase
4. ✅ Tạo database schemas
5. ✅ Load ~720,000 dòng dữ liệu từ CSV
6. ✅ Verify data integrity

**Thời gian cài đặt:** ~5-10 phút (tùy tốc độ mạng & máy)

---

## 📦 Cài đặt thủ công (từng bước)

### Bước 1: Clone repository

```bash
git clone https://github.com/VietDucFCB/car-recsys-consultant-chatbot.git
cd car-recsys-consultant-chatbot/car-recsys-system
```

### Bước 2: Chuẩn bị môi trường

```bash
# Cài đặt Python dependencies
pip install pandas psycopg2-binary

# Cấp quyền thực thi cho scripts
chmod +x setup.sh reset_database.sh
```

### Bước 3: Khởi động hệ thống

```bash
# Khởi động containers (PostgreSQL + PostgREST + Bytebase)
docker-compose up -d postgres postgrest bytebase

# Đợi 20 giây để PostgreSQL khởi động hoàn toàn
sleep 20
```

### Bước 4: Tạo database schema

```bash
# Tạo schemas và tables
docker-compose exec -T postgres psql -U admin -d car_recsys < database/init/01-init-bytebase.sql
docker-compose exec -T postgres psql -U admin -d car_recsys < database/init/02-create-schema.sql
docker-compose exec -T postgres psql -U admin -d car_recsys < database/init/04-create-all-tables.sql
```

### Bước 5: Load dữ liệu

```bash
# Load ~720k dòng dữ liệu từ 7 file CSV
python3 load_complete_database.py
```

**Output mong đợi:**
```
✅ used_vehicles                    :       5,508 rows  (Xe đã qua sử dụng)
✅ new_vehicles                     :       2,660 rows  (Xe mới)
✅ sellers                          :       2,862 rows  (Đại lý/Người bán)
✅ reviews_ratings                  :     347,378 rows  (Đánh giá)
✅ vehicle_features                 :      93,331 rows  (Tính năng)
✅ vehicle_images                   :     259,124 rows  (Hình ảnh)
✅ seller_vehicle_relationships     :       9,027 rows  (Quan hệ)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TỔNG CỘNG                        :     719,890 rows
```

### Bước 6: Kiểm tra hệ thống

```bash
python3 check_db_status.py
```

---

## 🔗 Truy cập Services

Sau khi cài đặt xong, bạn có thể truy cập:

### 1. **PostgREST API** (Auto-generated REST API)
- **URL:** http://localhost:3001
- **OpenAPI Docs:** http://localhost:3001/
- **Example:**
  ```bash
  # Lấy 5 xe
  curl "http://localhost:3001/used_vehicles?limit=5"
  
  # Filter theo brand
  curl "http://localhost:3001/used_vehicles?brand=eq.Toyota&limit=10"
  
  # Select specific columns
  curl "http://localhost:3001/used_vehicles?select=vehicle_id,title,price,brand&limit=5"
  ```

### 2. **Bytebase** (Database Management UI)
- **URL:** http://localhost:8080
- **Setup:**
  1. Tạo admin account khi lần đầu truy cập
  2. Add Instance với thông tin:
     - **Host:** `postgres` (tên container)
     - **Port:** `5432`
     - **Database:** `car_recsys`
     - **Username:** `bytebase_admin`
     - **Password:** `bytebase123`

### 3. **PostgreSQL** (Direct Access)
```bash
# Truy cập qua psql
docker-compose exec postgres psql -U admin -d car_recsys

# Hoặc qua host
psql -h localhost -U admin -d car_recsys
# Password: admin123
```

---

## 📊 Database Schema

### Raw Layer (7 bảng)

1. **used_vehicles** - Xe đã qua sử dụng (38 cột)
2. **new_vehicles** - Xe mới (38 cột)
3. **sellers** - Thông tin đại lý (22 cột)
4. **reviews_ratings** - Đánh giá khách hàng (17 cột)
5. **vehicle_features** - Tính năng chi tiết (6 cột)
6. **vehicle_images** - Hình ảnh xe (7 cột)
7. **seller_vehicle_relationships** - Liên kết seller-vehicle (9 cột)

### Gold Layer (4 bảng)

1. **users** - Người dùng hệ thống
2. **user_interactions** - Lịch sử tương tác
3. **user_favorites** - Xe yêu thích
4. **user_searches** - Lịch sử tìm kiếm
5. **chat_conversations** - Cuộc hội thoại chatbot
6. **chat_messages** - Tin nhắn chat

---

## 🤖 AI Chatbot Setup

Hệ thống tích hợp chatbot AI sử dụng GPT-4o-mini và Qdrant vector search.

### Bước 1: Cấu hình OpenAI API Key

```bash
# Copy file env mẫu
cp .env.example .env

# Edit file .env và thêm OPENAI_API_KEY
OPENAI_API_KEY=your-openai-api-key-here
```

### Bước 2: Khởi động Qdrant Vector Database

```bash
# Qdrant đã được include trong docker-compose
docker-compose up -d qdrant
```

### Bước 3: Ingest dữ liệu xe vào Qdrant

```bash
# Chạy script ingest (cần OPENAI_API_KEY)
cd backend
python scripts/ingest_chatbot_data.py

# Hoặc chỉ ingest một số lượng giới hạn để test
python scripts/ingest_chatbot_data.py --limit 100
```

**Lưu ý:** Script sẽ tạo embeddings cho mỗi xe sử dụng `text-embedding-3-large` (3072 dimensions).
Chi phí ước tính: ~$0.02/1000 vehicles

### Bước 4: Khởi động Backend với Chatbot

```bash
# Khởi động backend
docker-compose up -d backend

# Hoặc chạy local
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Chatbot API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/chat/message` | POST | Gửi tin nhắn và nhận phản hồi |
| `/api/v1/chat/conversations` | GET | Lấy danh sách cuộc hội thoại |
| `/api/v1/chat/conversation/{id}` | GET | Lấy tin nhắn của 1 cuộc hội thoại |
| `/api/v1/chat/conversation/{id}` | DELETE | Xóa cuộc hội thoại |
| `/api/v1/chat/health` | GET | Kiểm tra trạng thái chatbot |

### Frontend Chat Features

- **Chat Popup:** Floating chat bubble ở góc phải màn hình
- **Full Chat Page:** Trang chat đầy đủ tại `/chat`
- **Conversation History:** Lưu trữ và hiển thị lịch sử chat (cần đăng nhập)
- **Vehicle Cards:** Hiển thị xe được gợi ý inline trong chat

---

## 🛠️ Lệnh hữu ích

### Kiểm tra trạng thái containers
```bash
docker-compose ps
```

### Xem logs
```bash
# Postgres logs
docker-compose logs postgres

# PostgREST logs
docker-compose logs postgrest

# Bytebase logs
docker-compose logs bytebase
```

### Stop hệ thống
```bash
docker-compose down
```

### Reset database (xóa toàn bộ và load lại)
```bash
./reset_database.sh
```

### Backup database
```bash
docker-compose exec postgres pg_dump -U admin car_recsys > backup.sql
```

### Restore database
```bash
docker-compose exec -T postgres psql -U admin -d car_recsys < backup.sql
```

---

## 🐛 Troubleshooting

### Lỗi: "Port 5432 already in use"
```bash
# Kiểm tra process đang dùng port 5432
sudo lsof -i :5432

# Hoặc dùng port khác trong docker-compose.yml
ports:
  - "5433:5432"  # Thay 5432 -> 5433
```

### Lỗi: "Connection refused"
```bash
# Đợi Postgres khởi động hoàn toàn
docker-compose logs postgres | grep "ready to accept connections"

# Nếu không thấy, restart container
docker-compose restart postgres
```

### Lỗi: Load data thất bại
```bash
# Xóa và load lại
./reset_database.sh
```

### Kiểm tra dung lượng disk
```bash
# Kiểm tra volumes
docker system df -v

# Dọn dẹp (cẩn thận!)
docker system prune -a --volumes
```

---

## 📁 Cấu trúc thư mục

```
car-recsys-system/
├── database/
│   └── init/
│       ├── 01-init-bytebase.sql      # Tạo user cho Bytebase
│       ├── 02-create-schema.sql      # Schema chính
│       └── 04-create-all-tables.sql  # Tất cả tables
├── datasets/                          # 7 file CSV (~500MB)
│   ├── used_vehicles.csv
│   ├── new_vehicles.csv
│   ├── sellers.csv
│   ├── reviews_ratings.csv
│   ├── vehicle_features.csv
│   ├── vehicle_images.csv
│   └── seller_vehicle_relationships.csv
├── docker-compose.yml                 # Container orchestration
├── setup.sh                           # Setup script tự động
├── reset_database.sh                  # Reset database
├── load_complete_database.py          # Load data script
├── check_db_status.py                 # Kiểm tra DB
└── README.md                          # File này
```

---

## 🎯 Next Steps

Sau khi cài đặt xong, bạn có thể:

1. **Khám phá API:** Mở http://localhost:3001 để xem OpenAPI docs
2. **Quản lý DB:** Truy cập Bytebase tại http://localhost:8080
3. **Query data:** Dùng PostgREST để query thay vì viết SQL
4. **Build frontend:** Kết nối frontend với API tại port 3001

---

## 📞 Support

Nếu gặp vấn đề, tạo issue tại: https://github.com/VietDucFCB/car-recsys-consultant-chatbot/issues

---

## 📜 License

MIT License - Free to use for personal and commercial projects.

---

**Chúc bạn thành công! 🎉**
