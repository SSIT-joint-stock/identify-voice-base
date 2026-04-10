const fs = require("fs");
let schema = fs.readFileSync("apps/api/prisma/schema.prisma", "utf8");

// Remove is_active, version, and their indexes from voice_records
schema = schema.replace(
  /\/\/\/ true = bản đang được dùng để so khớp nhận dạng\n\s*is_active\s+Boolean\s+@default\(true\)\n/g,
  "",
);
schema = schema.replace(
  /\/\/\/ Số thứ tự phiên bản \(1, 2, 3\.\.\.\)\n\s*version\s+Int\s+@default\(1\)\n/g,
  "",
);
schema = schema.replace(
  /\s*@@index\(\[is_active\]\)\n\s*@@index\(\[user_id, is_active\]\)\n/g,
  "\n  @@unique([user_id])\n  @@unique([voice_id])\n",
);

// Add voice_update_logs model
const updateLogModel = `
/// Lịch sử cập nhật model giọng nói (khi admin quyết định enrich thêm data)
model voice_update_logs {
  id            String   @id @default(uuid()) @db.Uuid
  voice_id      String
  audio_file_id String   @db.Uuid
  updated_by    String   @db.Uuid
  created_at    DateTime @default(now())

  audio_file audio_files   @relation(fields: [audio_file_id], references: [id], onDelete: Restrict)
  operator   auth_accounts @relation(fields: [updated_by], references: [id], onDelete: Restrict)
  voice_record voice_records @relation(fields: [voice_id], references: [voice_id], onDelete: Cascade)

  @@index([voice_id])
  @@index([audio_file_id])
  @@map("voice_update_logs")
}
`;

schema = schema + "\n" + updateLogModel;

// update voice_records model to have unique voice_id so it can be referenced
// Wait, I already added @@unique([voice_id]) above.

// Next, add voice_update_logs to audio_files and auth_accounts
schema = schema.replace(
  /@@map\("audio_files"\)/,
  'voice_update_logs voice_update_logs[]\n\n  @@map("audio_files")',
);
schema = schema.replace(
  /@@map\("auth_accounts"\)/,
  'voice_update_logs voice_update_logs[]\n\n  @@map("auth_accounts")',
);

// Add voice_update_logs to voice_records
schema = schema.replace(
  /@@map\("voice_records"\)/,
  'voice_update_logs voice_update_logs[]\n\n  @@map("voice_records")',
);

fs.writeFileSync("apps/api/prisma/schema.prisma", schema);
