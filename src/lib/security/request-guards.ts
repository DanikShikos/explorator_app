/** True when a browser Origin header names a different host than this request. */
export function isCrossOrigin(origin: string | null, host: string | null) {
  if (!origin) return false;
  if (!host) return true;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}
