# Docker Deployment Guide

Tài liệu này mô tả 2 flow riêng:

- máy build/release: build image và push lên registry
- máy chạy ứng dụng: pull image từ registry và deploy bằng Docker Compose

## Tổng quan

Monorepo gồm:

- `apps/api`: NestJS API + worker
- `apps/client`: Vite/React frontend

Production hiện dùng:

- 1 image cho `backend`
- 1 image cho `client`
- `worker` dùng chung image với `backend`, khác command chạy
- `db` và `redis` chạy trực tiếp từ image public

## Development

Yêu cầu:

- Node.js 20+
- `pnpm` 9+
- Docker + Docker Compose

Khởi động local:

```bash
pnpm install
cp .env.example .env.development
pnpm infra:up
pnpm prisma:generate
pnpm dev
```

Frontend dev mặc định gọi API qua `http://localhost:3000`. Nếu cần đổi proxy local:

```bash
VITE_DEV_API_PROXY_TARGET=http://your-api-host:3000 pnpm dev:client
```

## Flow Deploy Bằng Docker Image

Flow chuẩn:

1. Máy build tạo image `backend` và `client`
2. Máy build push image lên registry
3. Máy chạy chỉ cần có `docker-compose.prod.yml` và `.env.production`
4. Máy chạy pull image về
5. Máy chạy migrate database
6. Máy chạy start hoặc restart stack

## File Cần Có Trên Máy Chạy

- `docker-compose.prod.yml`
- `.env.production`
- `Makefile`
- `DEPLOYMENT.md`

Source code không bắt buộc phải có nếu bên chạy chỉ cần pull image từ registry.

## Chuẩn Bị `.env.production`

Tạo file env từ template:

```bash
cp .env.production.example .env.production
```

Nhóm biến quan trọng:

- Image: `BACKEND_IMAGE`, `CLIENT_IMAGE`, `IMAGE_TAG`
- Runtime: `CLIENT_PORT`, `PORT`, `CLIENT_API_BASE_URL`
- Database: `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SCHEMA`
- Redis: `REDIS_PASSWORD`
- Auth: `JWT_*`
- Email: `SMTP_*`, `EMAIL_FROM`
- Service ngoài: `AI_SERVICE_URL`, `GOOGLE_*`
- Network/Security: `CORS_ORIGINS`, `COOKIE_*`

Lưu ý:

- `CLIENT_API_BASE_URL` mặc định là `/api/v1`, frontend lấy runtime config từ container nên đổi biến này không cần rebuild image FE.
- `BACKEND_IMAGE`, `CLIENT_IMAGE`, `IMAGE_TAG` nên được điền rõ trong `.env.production` nếu bạn chạy `docker compose ...` trực tiếp thay vì qua `make`.

Ví dụ:

```env
BACKEND_IMAGE=ghcr.io/your-org/identify-voice-backend
CLIENT_IMAGE=ghcr.io/your-org/identify-voice-client
IMAGE_TAG=v1.0.0
CLIENT_PORT=8080
CLIENT_API_BASE_URL=/api/v1
```

### Ghi chú quan trọng cho các URL/domain trong `.env.production`

Các biến dưới đây phải điền đúng theo môi trường thực tế. Nếu điền sai domain hoặc vẫn để placeholder kiểu `example.com`, app rất dễ gặp các lỗi như:

- frontend gọi sai API
- audio URL trả về mở không được
- cookie không được set đúng domain
- request từ browser bị chặn do CORS
- backend/worker gọi sai AI service

#### `BACKEND_URL`

Dùng làm URL public của backend trong một số flow redirect hoặc callback.

Ví dụ:

- local Docker: `http://localhost:8080`
- production có domain riêng cho API: `https://api.your-domain.com`
- production dùng chung domain qua reverse proxy: `https://your-domain.com`

Không nên để:

- `https://api.example.com`
- domain mẫu không tồn tại

#### `STORAGE_CDN_URL`

Đây là base URL để backend dựng `audio_url` trả về cho frontend.

Ví dụ:

- local Docker: `http://localhost:8080/cdn`
- production: `https://your-domain.com/cdn`

Nếu biến này sai:

- upload vẫn có thể thành công
- nhưng FE nhận `audio_url` sai host và phát/tải audio không được

#### `AI_SERVICE_URL`

Đây là URL backend/worker gọi sang AI service.

Ví dụ:

- local qua ngrok: `https://your-ngrok-domain.ngrok-free.app`
- cùng mạng Docker: `http://ai-service:5000`
- server thật: `http://10.x.x.x:5000` hoặc domain internal/public tương ứng

Nếu biến này sai:

- enroll/identify/update voice sẽ fail
- thường gặp timeout, connection refused hoặc AI service không phản hồi

#### `CORS_ORIGINS`

Danh sách origin frontend được phép gọi backend, phân tách bằng dấu phẩy.

Ví dụ:

- local: `http://localhost:8080`
- nhiều origin: `http://localhost:8080,https://app.your-domain.com`

Nếu biến này sai:

- browser bị chặn request do CORS
- test bằng curl/Postman có thể vẫn được nhưng FE sẽ lỗi

#### `COOKIE_DOMAIN`

Domain dùng để set cookie refresh token / auth cookie.

Ví dụ:

- local: `localhost`
- production nhiều subdomain: `.your-domain.com`
- production một domain cụ thể: `app.your-domain.com`

Nếu biến này sai:

- login có thể thành công ở API nhưng browser không lưu cookie đúng
- refresh token hoặc session cookie hoạt động không ổn định

Khuyến nghị:

- local nên dùng giá trị đơn giản như `localhost`
- production chỉ dùng domain thật, không để `example.com`

#### Checklist nhanh trước khi deploy

Trước khi chạy `make up`, nên rà lại 5 biến này:

```env
BACKEND_URL=
STORAGE_CDN_URL=
AI_SERVICE_URL=
CORS_ORIGINS=
COOKIE_DOMAIN=
```

Nếu đang test local bằng Docker Compose, bộ giá trị tối thiểu thường sẽ giống:

```env
BACKEND_URL=http://localhost:8080
STORAGE_CDN_URL=http://localhost:8080/cdn
AI_SERVICE_URL=https://your-ngrok-domain.ngrok-free.app
CORS_ORIGINS=http://localhost:8080
COOKIE_DOMAIN=localhost
```

## Phần 1: Build Và Push Lên Registry

Phần này chạy ở máy build hoặc CI.

### 1. Đăng nhập registry

Ví dụ với GitHub Container Registry:

```bash
docker login ghcr.io
```

Ví dụ với Docker Hub:

```bash
docker login
```

### 2. Chọn tên image và tag

Điền vào `.env.production` hoặc export trực tiếp:

```bash
export BACKEND_IMAGE=ghcr.io/your-org/identify-voice-backend
export CLIENT_IMAGE=ghcr.io/your-org/identify-voice-client
export IMAGE_TAG=v1.0.0
```

Khuyến nghị:

- dùng tag theo version hoặc ngày build, ví dụ `v1.0.0`, `2026.04.16`
- không chỉ dựa vào `latest` nếu có nhiều môi trường

### 3. Build image

```bash
make build
```

Lệnh này sẽ:

- build image backend từ `apps/api/Dockerfile`
- build image client từ `apps/client/Dockerfile`

### 4. Push image lên registry

```bash
make push
```

Sau khi push xong, kiểm tra lại image/tag trên registry của bạn.

### 5. Khi cập nhật version mới

Mỗi lần thay đổi code:

1. đổi `IMAGE_TAG`
2. build lại image
3. push lại image
4. cập nhật `IMAGE_TAG` tương ứng ở máy chạy
5. pull và restart

## Phần 2: Pull Và Deploy Ở Máy Chạy

Phần này chạy ở máy server hoặc máy của bên nhận bàn giao.

### 1. Chuẩn bị file deploy

Máy chạy cần có:

- `docker-compose.prod.yml`
- `.env.production`
- `Makefile`

Nếu registry private, cần login trước:

```bash
docker login ghcr.io
```

### 2. Pull image từ registry

```bash
make pull
```

### 3. Khởi động stack

```bash
make up
```

### 4. Chạy migration database

```bash
make migrate
```

Khuyến nghị khi deploy mới:

1. `make pull`
2. `make up`
3. `make migrate`

Nếu cần seed dữ liệu ban đầu:

```bash
make seed
```

### 5. Kiểm tra sau deploy

```bash
make ps
make logs
```

Những thứ nên check:

- `db`, `redis`, `backend`, `worker`, `client` đều ở trạng thái `Up`
- frontend vào được ở `http://localhost:8080` hoặc domain tương ứng
- backend login được
- upload audio / enroll / identify chạy được
- migration và seed không lỗi

### 6. Update version mới

Khi có image mới trên registry:

```bash
make pull
make up
make migrate
```

Nếu chỉ đổi config:

- sửa `.env.production`
- chạy lại `make up` hoặc `make restart`

## Lệnh Thường Dùng

```bash
make build
make push
make pull
make up
make down
make restart
make ps
make logs
make migrate
make seed
```

Ý nghĩa:

- `make build`: build image backend và client
- `make push`: push image lên registry
- `make pull`: pull image từ registry
- `make up`: chạy stack bằng compose
- `make down`: dừng stack
- `make restart`: restart stack đang chạy
- `make ps`: xem trạng thái container
- `make logs`: xem logs realtime
- `make migrate`: chạy `prisma migrate deploy`
- `make seed`: seed dữ liệu production bằng file đã build

## Ghi Chú Deploy

- Frontend chạy bằng `nginx` và reverse proxy `/api`, `/api-docs`, `/docs`, `/cdn`, `/health` sang service `backend`.
- Dữ liệu audio/runtime của backend được mount vào volume `voice_storage`.
- Logs runtime của backend/worker được mount vào volume `voice_logs`.
- `worker` dùng cùng image với `backend`, chỉ khác command khởi động.
- `db` và `redis` không cần build image riêng.
- Nếu thấy warning kiểu `The "BACKEND_IMAGE" variable is not set`, hãy thêm `BACKEND_IMAGE`, `CLIENT_IMAGE`, `IMAGE_TAG` vào `.env.production` hoặc dùng `make` thay vì gọi `docker compose` trực tiếp.

## Checklist Bàn Giao

Khi bàn giao cho bên khác tự vận hành, tối thiểu nên bàn giao:

- tên image registry
- tag đang dùng
- `docker-compose.prod.yml`
- `.env.production.example`
- `Makefile`
- `DEPLOYMENT.md`

Nếu chỉ bàn giao image mà không có file deploy/config, bên nhận vẫn phải tự viết lại compose và env để chạy được.
