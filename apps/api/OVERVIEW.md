# 🎙️ Voice Identify Service - Backend API Overview

The backend of the **Voice Identify Service** is a high-performance **NestJS** application designed with scalability, reliability, and security in mind. It serves as the primary orchestration layer for the platform, managing authentication, voice record management, and identification session processing.

---

## 🏗️ Architecture & Philosophy

The backend is built using a **Clean Architecture** approach, specifically the **Use-Case Pattern**. This is inspired by the `ecommerce-base` project structure, providing a clear separation between infrastructure (database, workers) and business logic.

### Directory Structure

```text
apps/api
├── prisma              # Database management
│   ├── schema.prisma   # PostgreSQL models
│   └── migrations      # Database history
├── src
│   ├── common          # Universal NestJS components
│   │   ├── filters     # Global exception handling
│   │   ├── guards      # Auth & Throttler guards
│   │   └── interceptors # Logging & JSON responses
│   ├── config          # Dynamic environment config
│   │   ├── index.ts    # Main config export
│   │   ├── app.config.ts # API server settings
│   │   └── database.config.ts # Prisma Pg settings
│   ├── database        # Resource providers
│   │   ├── prisma      # Prisma Service & Module
│   │   └── redis       # Redis connection provider
│   ├── module          # Feature-based business logic
│   │   ├── auth        # User Identity & Security
│   │   ├── enroll      # Voice Registration & AI Enrolling
│   │   ├── voices      # Profile & Record management
│   │   └── identify    # AI Integration & Sessions
│   ├── shared          # Global reusable artifacts
│   │   ├── interfaces  # BaseUseCase defined here
│   │   └── constants   # Global status codes
│   ├── workers         # Background processing
│   │   ├── voice       # Job processors for identification
│   │   ├── worker.module.ts # Context for job processing
│   │   └── worker.main.ts   # Entry point for the worker
│   ├── main.ts         # Main API entry point (HTTP)
│   └── app.module.ts   # Root NestJS module
├── Dockerfile          # Multi-stage Docker build
└── package.json        # Service dependencies
```

---

## 🔑 Core Features and Modules

### 1. Authentication Module (`/auth`)

We use JWT-based authentication for secure access. The module follows the Use-Case pattern:

- **`RegisterUserUseCase`**: Handles creation of accounts with password hashing.
- **`LoginUserUseCase`**: Verifies credentials and generates a signed access token.
- **`AuthService`**: Orchestrates these use-cases.

### 2. Enroll Module (`/voices/enroll`)

Quản lý việc đăng ký thông tin người dùng mới cùng mẫu giọng nói mẫu.

- **`EnrollVoiceUseCase`**: Thực hiện toàn bộ quy trình từ nhận file, gọi AI Service trích xuất đặc trưng, đến lưu trữ hồ sơ tập trung vào database.
- **AI Service Integration**: Tự động đồng bộ `voice_id` từ hệ thống AI và lưu URL audio phục vụ tra cứu.

### 3. Voices Module (`/voices`)

This module manages the "Ground Truth" of voice records.

- **`CreateVoiceRecordUseCase`**: Saves a new voice profile (CCCD, Phone, Audio Metadata).
- **`GetVoiceRecordUseCase`**: Retrieves detailed voice profiles.

### 3. Identify Module (`/identify`)

This is the heart of the system.

- **`StartIdentifySessionUseCase`**: When a user submits an audio for identification, this use-case creates a session in PostgreSQL and enqueues a job in **Redis (BullMQ)** for processing.
- **Status tracking**: Sessions track the state of identification (PENDING, PROCESSING, COMPLETED, FAILED).

---

## 🛠️ Background Processing (Worker)

To keep the API responsive, heavy identification tasks are offloaded to our background worker system.

### BullMQ Integration

The `IdentifyModule` pushes a job:

```typescript
// Enqueue job for background processing
await this.voiceQueue.add('identify-voice', {
  sessionId: session.id,
  audioUrl: session.audio_url,
  sessionType: session.session_type,
});
```

The `VoiceProcessor` at `apps/api/src/workers/voice/voice.processor.ts` picks it up:

1.  **Extract Data**: Receives the session ID and audio source.
2.  **AI Processing**: Placeholder for calling the identification engine.
3.  **Update Database**: Writes back the identification results (Confidence, Match).

### Worker Entry Point

The worker has its own entry point `worker.main.ts`. It initializes a `NestFactory.createApplicationContext(WorkerModule)`, which avoids booting up the HTTP server and overhead while still having access to Prisma and Config services.

---

## 💾 Database Management: Prisma 7

The project uses **Prisma v7** for database orchestration. We utilize the `PrismaPg` adapter to manage PostgreSQL connections via a pre-configured `pg` Pool.

### Key Config (PrismaService.ts)

```typescript
const pool = new Pool({
  connectionString,
  max: 12,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
const adapter = new PrismaPg(pool);
super({ adapter });
```

### Database Models & Snake Case

We strictly use `snake_case` for database column and table names to align with standard PostgreSQL conventions, while maintaining `camelCase` in our TypeScript application via Prisma mapping.

```prisma
model voice_records {
  id         String   @id @default(uuid()) @db.Uuid
  name       String   @db.VarChar(255)
  cccd       String   @unique @db.VarChar(12)
  phone      String   @db.VarChar(15)
  audio_url  String   @db.Text
  metadata   Json?    @db.JsonB
  created_at DateTime @default(now()) @db.Timestamp(6)
  updated_at DateTime @updatedAt @db.Timestamp(6)
}
```

---

## ⚙️ Configuration System

Our configuration system is dynamic and validates environment variables on startup.

### Environments

- `.env.development`: For local coding.
- `.env.production`: For containerized deployment.

### Validation Schema (`validateEnv`)

Located in `apps/api/src/config/index.ts`, we use `class-validator` and `class-transformer` to ensure all required fields like `DATABASE_URL`, `JWT_SECRET`, and `REDIS_HOST` are present. If a variable is missing, the backend will fail-fast and throw an error with a detailed report.

### Configuration Registry

- **`app`**: Server port, environment (dev/prod).
- **`database`**: PostgreSQL connection strings and pool settings.
- **`jwt`**: Secret keys and expiration timings.
- **`redis`**: Host, port, and authentication for BullMQ.
- **`throttler`**: Rate limiting thresholds (default 10 requests per minute).

---

## 📖 API Documentation (Swagger)

The backend provides built-in API documentation available at `/api/docs`.

- **Tags**: Organized by feature (Auth, Voices, Identify).
- **DTOs**: Every request/response is documented with examples and validation requirements.
- **Bearer Auth**: JWT protection is visualized in the UI for easy testing.

### Swagger Documentation Rules

1.  All exposed variables must have `@ApiProperty()`.
2.  All controllers must specify `@ApiTags()`.
3.  Error responses (`401`, `403`, `404`) must be explicitly documented using `@ApiResponse()`.

---

## 🛡️ Security Best Practices

### 1. Robust Rate Limiting

We use `ThrottlerModule` to protect all API endpoints from brute-force attacks and resource exhaustion.

### 2. Standardized JWT Guards

A customized `JwtAuthGuard` ensures all endpoints in `IdentifyModule` and `VoicesModule` (protected routes) are secured.

### 3. Response Standardization

All API responses are wrapped by the `ResponseInterceptor` at `apps/api/src/common/interceptors/response.interceptor.ts`.

### Standard Success Format:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "meta": {
    "timestamp": "2026-04-04T15:26:00Z"
  }
}
```

### Standard Error Format:

Managed by the `AllExceptionsFilter`, providing a clear error trace for debugging while shielding internal database details from production users.

---

## 🏗️ Use-Case Pattern Implementation example

The project follows a **Clean Architecture** approach using the **Use-Case Pattern**. Instead of bloated services, every business action is encapsulated in a specific class.

### Example: RegisterUserUseCase

Located in `apps/api/src/module/auth/use-cases/register-user.usecase.ts`:

1.  **Validate input**: Check if user exists.
2.  **Secure data**: Hash the password using bcrypt.
3.  **Persist**: Save the account to the database via Prisma.
4.  **Return**: Return the created user (masking sensitive data).

### Benefits of the Use-Case Pattern:

- **Testability**: Each use-case can be unit-tested in isolation, without mocking entire services.
- **Readability**: Clear boundaries for business logic. Each file does one thing.
- **Maintainability**: Changes in one feature (e.g., Auth) don't impact others (e.g., Identify).

---

## 🐳 Docker Deployment Strategy

The `Dockerfile` is optimized for NestJS. It uses a multi-stage approach to minimize the final image size and reduce the attack surface.

### Builder Stage

- Uses `node:20-alpine`.
- Installs all dependencies.
- Compiles TypeScript to JavaScript in the `dist/` directory.

### Runner Stage

- Only copies `package.json`, production `node_modules`, and the `dist/` folder.
- Sets `NODE_ENV` to production.
- Runs as a non-root user for enhanced security.

To start the API and Worker in production mode:

```bash
docker compose up api worker -d
```

---

## 📊 Monitoring & Logging

We utilize **Winston** for structured logging across the application. Logs include:

- **HTTP Logs**: Captured by `HttpLogInterceptor`.
- **System Logs**: Application lifecycle events.
- **Error Logs**: Persistent trace of all failures.

All logs are formatted as JSON in production for easy ingestion by ELK or Grafana Loki stacks.

---

## 📞 Support and Team

This backend was architected by the **SSIT Engineering Team**. For questions regarding the identification algorithm or database schema, please reach out via GitHub Issues.

---
