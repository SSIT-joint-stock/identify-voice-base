/**
 * Ký tự đầu (theo locale vi) để nhóm danh bạ A / B / C / …
 * Ký tự không phải chữ cái → "#" (hiển thị "Khác").
 */
export function getDirectoryAlphaSection(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "#";

  const first = trimmed[0];
  if (!first) return "#";

  const upper = first.toLocaleUpperCase("vi-VN");
  const letter = upper.normalize("NFC")[0] ?? upper;

  if (/[\p{L}]/u.test(letter)) {
    return letter;
  }

  return "#";
}

export function formatDirectorySectionLabel(section: string): string {
  if (section === "#") return "#";
  return section;
}
