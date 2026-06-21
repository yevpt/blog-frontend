export function resolveApiBaseUrl(value: string | undefined): string {
  return value || "/api";
}
