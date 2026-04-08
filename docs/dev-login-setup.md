# Dev Login Setup (After Pull)

Tài liệu này mô tả các lệnh cần chạy để feature đăng nhập hoạt động ổn định sau khi pull nhánh mới.

## Khi nào cần chạy?

- Pull nhánh có thay đổi backend auth, prisma schema, migrations hoặc seed.
- Setup máy mới / database mới.

## Checklist nhanh

Chạy ở root monorepo `identify-voice-base`:

```bash
pnpm install
pnpm --filter api prisma:generate
pnpm --filter api exec prisma migrate deploy
pnpm --filter api db:seed:dev
pnpm run dev
```

## Ghi chú

- `pnpm run dev` **không tự migrate** và **không tự seed**.
- Nếu bỏ qua migrate/seed, login có thể lỗi do thiếu bảng hoặc thiếu tài khoản.
- Seed mặc định sẽ tạo tài khoản:
  - email: `admin@example.com`
  - password: `123456`
- Có thể đổi tài khoản seed bằng env:
  - `SEED_ADMIN_EMAIL`
  - `SEED_ADMIN_USERNAME`
  - `SEED_ADMIN_PASSWORD`

## Trường hợp chỉ chạy lại app

Nếu DB đã đúng schema và đã seed trước đó, chỉ cần:

```bash
pnpm run dev
```
