# AI Test Management

Đây là dự án Django `ai_test_management` được thiết kế để quản lý test case, script, báo cáo, bug, tenant và AI support.

## Nội dung README

- Giới thiệu
- Yêu cầu môi trường
- Cài đặt nhanh
- Chạy ứng dụng với môi trường local
- Chạy ứng dụng bằng Docker
- Cấu hình môi trường
- Migrations
- Tạo superuser
- Thông tin thêm

## 1. Giới thiệu

Dự án sử dụng Django 5.2, PostgreSQL, HTMX và tích hợp AI provider. Hiện tại cấu hình mặc định dùng `AI_PROVIDER=stub` để phát triển offline.

## 2. Yêu cầu môi trường

- Python 3.11
- pip
- Docker & Docker Compose (nếu muốn dùng Docker)
- PostgreSQL nếu chạy ngoài Docker (mặc định trong Docker Compose đã có sẵn)

## 3. Cài đặt nhanh (local)

```bash
cd "d:/Project_Final_ Internship/ai_test_management"
python -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt
```

> Trên Windows, nếu dùng Git Bash thì `source venv/Scripts/activate`.

## 4. Cấu hình môi trường

Dự án đã có file `.env` mẫu. Nếu muốn thay đổi, chỉnh sửa giá trị trong file `.env`:

```env
SECRET_KEY=...
DEBUG=True
ALLOWED_HOSTS=*
POSTGRES_DB=ai_test_management
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_password_123
POSTGRES_HOST=db
POSTGRES_PORT=5432
AI_PROVIDER=stub
# OPENAI_API_KEY=sk-...
```

### Lưu ý

- `AI_PROVIDER=stub` dùng cho phát triển, không gọi ra OpenAI.
- Nếu dùng OpenAI, đổi `AI_PROVIDER=openai` và đặt `OPENAI_API_KEY`.

### Dùng Gemini để sinh test case

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-3.6-flash
```

Luồng sinh test case dùng Gemini Interactions API và structured JSON output. Sau khi
đổi dependency hoặc chạy bằng Docker, cài lại packages / build lại image để SDK Google
được cập nhật:

```bash
pip install -U -r requirements.txt
# hoặc: docker compose up --build
```

## 5. Migrations

Tạo migration và cập nhật database:

```bash
python manage.py makemigrations
python manage.py migrate
```

Nếu chạy trong Docker lần đầu, dùng:

```bash
docker compose up --build
```

## 6. Tạo user quản trị

```bash
python manage.py createsuperuser
```

Sau đó truy cập admin:

```
http://127.0.0.1:8000/admin/
```

## 7. Chạy ứng dụng

### Chạy local không Docker

```bash
python manage.py runserver
```

Truy cập:

```
http://127.0.0.1:8000/
```

### Chạy bằng Docker

```bash
docker compose up --build
```

Mở browser tại:

```
http://127.0.0.1:8000/
```

## 8. Cấu trúc dự án chính

- `apps/` - các Django app domain: `accounts`, `tenants`, `testcases`, `scripts`, `bugs`, `reports`, `ai`, `core`
- `config/` - cấu hình Django gồm `settings.py`, `urls.py`, `wsgi.py`, `asgi.py`
- `templates/` - template dùng chung
- `static/` - tài nguyên CSS/JS
- `requirements.txt` - dependency của dự án

## 9. Ghi chú cho team

- Trước khi push code, chạy `python manage.py makemigrations` nếu thay đổi model.
- Luôn chạy `python manage.py migrate` khi cập nhật database.
- Giữ `.env` riêng, không commit API key hay dữ liệu nhạy cảm.
- Nếu thêm middleware, kiểm tra `settings.py` và `MIDDLEWARE`.

## 10. Hỗ trợ

Nếu cần trợ giúp thêm, liên hệ team trưởng hoặc đọc thêm tài liệu Django: https://docs.djangoproject.com/en/5.2/
