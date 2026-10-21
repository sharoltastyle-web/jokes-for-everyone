import "server-only";

// Origins allowed to call the API, per environment (ARCHITECTURE §9).
function allowedOrigins(): Set<string> {
  const origins = new Set<string>();
  if (process.env.APP_ORIGIN) {
    origins.add(process.env.APP_ORIGIN.replace(/\/+$/, ""));
  }
  if (process.env.VERCEL_URL) {
    origins.add(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.VERCEL_BRANCH_URL) {
    origins.add(`https://${process.env.VERCEL_BRANCH_URL}`);
  }
  if (process.env.NODE_ENV === "development") {
    origins.add(`http://localhost:${process.env.PORT ?? 3000}`);
  }
  return origins;
}

export function isAllowedOrigin(origin: string | null): boolean {
  return origin !== null && allowedOrigins().has(origin);
}
