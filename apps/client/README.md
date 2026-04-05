# Voice Identify — Frontend Application

Hệ thống nhận diện và xác thực giọng nói — Frontend Base sử dụng Vite, React và TypeScript.

## Tech Stack

### Core

- **Framework**: Vite + React 19 + TypeScript
- **State Management**: TanStack React Query v5 (Server State) & Zustand (UI State)
- **HTTP Client**: Axios with Interceptors
- **Form & Validation**: React Hook Form + Zod
- **Styling**: Tailwind CSS v4 + shadcn/ui (Radix UI)
- **Routing**: React Router v7

### Tools

- **Component Library**: shadcn/ui
- **Icons**: Lucide React
- **Notifications**: Sonner (Toast)
- **File Upload**: React Dropzone

## Project Structure

```text
voice-identify-fe/
├── src/
│   ├── api/            # Axios instance & global interceptors
│   ├── components/
│   │   └── ui/         # shadcn/ui reusable components
│   ├── configs/        # App configurations (env, constants)
│   ├── feature/        # Feature-based modules (Voice Recognition)
│   │   └── voice/
│   │       ├── api/    # Feature-specific API calls
│   │       ├── hooks/  # Modular hooks (useVoice)
│   │       ├── schemas/# Zod validation schemas
│   │       └── store/  # Feature-specific Zustand stores
│   ├── hooks/          # Global reusable hooks
│   ├── layouts/        # Layout wrappers (MainLayout)
│   ├── libs/           # Third-party library initializations (QueryClient)
│   ├── pages/          # Page components
│   ├── types/          # Global TypeScript interfaces
│   └── utils/          # Global helper functions
├── .env                # Environment variables
├── components.json     # shadcn/ui configuration
├── postcss.config.mjs  # PostCSS configuration for Tailwind v4
└── vite.config.ts      # Vite configuration with @ alias
```

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm or pnpm

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/trh-thanh30/voice-identify-fe.git
   cd voice-identify-fe
   ```

2. **Environment Setup**

   Tạo file `.env` từ mẫu:

   ```bash
   VITE_API_BASE_URL=
   ```

3. **Install Dependencies**

   ```bash
   npm install
   ```

4. **Start Development Server**

   ```bash
   npm run dev
   ```

5. **Access**
   - Local: http://localhost:5173

## Command Reference

| Command           | Description                              |
| :---------------- | :--------------------------------------- |
| `npm run dev`     | Chạy ứng dụng ở chế độ development       |
| `npm run build`   | Build ứng dụng cho môi trường production |
| `npm run lint`    | Kiểm tra lỗi code với ESLint             |
| `npm run preview` | Chạy thử bản build production            |

## Git Conventions

Project sử dụng **Conventional Commits**.

```text
<type>: <subject>
```

| Type       | Mô tả                |
| :--------- | :------------------- |
| `feat`     | Tính năng mới        |
| `fix`      | Sửa bug              |
| `docs`     | Thay đổi tài liệu    |
| `refactor` | Refactor code        |
| `test`     | Thêm / cập nhật test |
| `chore`    | Công việc bảo trì    |

## Documentation

Tài liệu chi tiết về kiến trúc API và Modular Hook Pattern:

- [Voice Recognition Design Pattern](./src/feature/voice-recognition-pattern.md) — Hướng dẫn chi tiết cách dùng API & Hook.
