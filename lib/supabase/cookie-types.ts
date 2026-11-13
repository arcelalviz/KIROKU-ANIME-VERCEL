/**
 * Cookie data passed by Supabase SSR's `setAll` callback.
 * Explicit types prevent TS7006/TS7031 in strict Next.js production builds.
 */
export type SupabaseCookieToSet = {
  name: string;
  value: string;
  options?: {
    domain?: string;
    path?: string;
    maxAge?: number;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: boolean | "lax" | "strict" | "none";
    priority?: "low" | "medium" | "high";
    partitioned?: boolean;
  };
};
