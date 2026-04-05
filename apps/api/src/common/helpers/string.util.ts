/**
 * Convert string to slug
 * @param text - Text to convert
 * @returns Slug string
 */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[đĐ]/g, 'd')
    .replace(/([^0-9a-z-\s])/g, '') // Remove special characters
    .replace(/(\s+)/g, '-') // Replace spaces with -
    .replace(/-+/g, '-') // Remove redundant -
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing -
}
