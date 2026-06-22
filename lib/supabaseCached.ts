import { createClient } from "@/lib/supabase/client";
import { cacheGet, cacheSet } from "./cache";

const supabase = createClient();
const DEFAULT_TTL = 20_000;

export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl = DEFAULT_TTL
): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached) return cached;

  const result = await queryFn();
  cacheSet(key, result, ttl);
  return result;
}
