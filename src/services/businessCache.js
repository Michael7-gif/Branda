import API_URL from "./api";

let businessCache = null;
let businessCacheTime = 0;
let businessRequest = null;
const CACHE_TIME = 15000;

export function getCachedBusiness() {
  if (
    businessCache &&
    Date.now() - businessCacheTime < CACHE_TIME
  ) {
    return businessCache;
  }

  return null;
}

export async function getMyBusiness() {
  if (
    businessCache &&
    Date.now() - businessCacheTime < CACHE_TIME
  ) {
    return businessCache;
  }

  if (businessRequest) {
    return businessRequest;
  }

  businessRequest = fetch(`${API_URL}/api/business/me`, {
    credentials: "include"
  })
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const error = new Error(
          data.message || "Unable to load your business."
        );
        error.status = response.status;
        throw error;
      }

      businessCache = data.business || null;
      businessCacheTime = Date.now();

      return businessCache;
    })
    .finally(() => {
      businessRequest = null;
    });

  return businessRequest;
}

export function setMyBusiness(business) {
  businessCache = business || null;
  businessCacheTime = business ? Date.now() : 0;
}

export function clearMyBusiness() {
  businessCache = null;
  businessCacheTime = 0;
}
