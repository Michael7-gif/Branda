const DB_NAME = "branda-client-data";
const STORE_NAME = "persistent";

let dbPromise = null;
const memory = new Map();

function openDatabase() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(() => null);

  return dbPromise;
}

export async function getPersistent(key, fallback = null) {
  if (memory.has(key)) {
    return memory.get(key);
  }

  const db = await openDatabase();

  if (!db) {
    return fallback;
  }

  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(key);

    request.onsuccess = () => {
      const value = request.result ?? fallback;

      if (request.result !== undefined) {
        memory.set(key, request.result);
      }

      resolve(value);
    };

    request.onerror = () => resolve(fallback);
  });
}

export async function setPersistent(key, value) {
  memory.set(key, value);

  const db = await openDatabase();

  if (!db) {
    return value;
  }

  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");

    transaction.objectStore(STORE_NAME).put(value, key);

    transaction.oncomplete = () => resolve(value);
    transaction.onerror = () => resolve(value);
  });
}

export async function removePersistent(key) {
  memory.delete(key);

  const db = await openDatabase();

  if (!db) {
    return;
  }

  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");

    transaction.objectStore(STORE_NAME).delete(key);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
  });
}
