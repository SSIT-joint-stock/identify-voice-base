export function parseByAliasMap<T>(
  search: string | undefined,
  normalize: (value: string) => string,
  aliasMap: Record<string, T>,
): T | undefined {
  if (!search) return undefined;

  const normalized = normalize(search);
  return aliasMap[normalized];
}
