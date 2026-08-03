# 1. Dùng Python 3.11 bản lightweight (Alpine/Slim)
FROM python:3.11-slim

# 2. Ngăn Python ghi file .pyc và bật log trực tiếp ra console
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Tạo và chuyển làm việc tại thư mục /app trong container
WORKDIR /app

# 4. Cài đặt các thư viện hệ thống cần thiết cho PostgreSQL
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 5. Sao chép file requirements.txt và cài đặt thư viện Python
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# 6. Sao chép toàn bộ source code vào container
COPY . /app/

# 7. Mở cổng 8000 cho Django
EXPOSE 8000

# 8. Lệnh mặc định khởi chạy Django Development Server
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]