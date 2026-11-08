/** Reads a required env var at call time, so a missing value fails the request, not the build. */
export function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name}. See apps/web/.env.example.`);
  return value;
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// NEXT_PUBLIC_* must be referenced literally so Next inlines them in browser bundles.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
