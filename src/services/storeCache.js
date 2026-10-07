import API_URL from "./api";

const cache = new Map();
const inFlight = new Map();
const CACHE_TIME = 10000;

export async function getStore(slug) {
  if (!slug) {
    return null;
  }

  const key = String(slug);

  const cached = cache.get(key);

  if (cached && Date.now() - cached.time < CACHE_TIME) {
    return cached.data;
  }

  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const request = fetch(
    `${API_URL}/api/store/${encodeURIComponent(key)}`
  )
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load this store."
        );
      }

      cache.set(key, {
        data,
        time: Date.now()
      });

      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, request);

  return request;
}

export function clearStoreCache(slug) {
  if (slug) {
    cache.delete(String(slug));
    return;
  }

  cache.clear();
}
