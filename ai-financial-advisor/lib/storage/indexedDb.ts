/**
 * IndexedDB Service for storing larger files (PDFs, statement CSVs, research documents)
 * Keeps LocalStorage lightweight while retaining complete file contents locally in the browser.
 */

const DB_NAME = "ArthaAdvisorDB_v1";
const DB_VERSION = 1;
const STORE_NAME = "fileBlobs";

interface StoredFileRecord {
  id: string;
  fileName: string;
  fileType: string;
  sizeBytes: number;
  data: Blob | string; // Binary blob or base64
  uploadedAt: string;
}

// In-memory fallback if IndexedDB is disabled (e.g. strict private browsing mode)
const memoryBlobFallback = new Map<string, StoredFileRecord>();

function isIndexedDBAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function getDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      return reject(new Error("IndexedDB is not supported or accessible in this environment."));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Stores a file blob into IndexedDB
 */
export async function storeFileInIndexedDB(
  id: string,
  fileName: string,
  fileType: string,
  data: Blob | string
): Promise<StoredFileRecord> {
  const sizeBytes = typeof data === "string" ? data.length : data.size;
  const record: StoredFileRecord = {
    id,
    fileName,
    fileType,
    sizeBytes,
    data,
    uploadedAt: new Date().toISOString(),
  };

  try {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB storage failed, using in-memory fallback:", err);
    memoryBlobFallback.set(id, record);
    return record;
  }
}

/**
 * Retrieves a file blob by ID from IndexedDB
 */
export async function getFileFromIndexedDB(id: string): Promise<StoredFileRecord | null> {
  if (memoryBlobFallback.has(id)) {
    return memoryBlobFallback.get(id) || null;
  }

  try {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB get error:", err);
    return memoryBlobFallback.get(id) || null;
  }
}

/**
 * Deletes a file blob from IndexedDB
 */
export async function deleteFileFromIndexedDB(id: string): Promise<boolean> {
  memoryBlobFallback.delete(id);

  try {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB delete error:", err);
    return true;
  }
}

/**
 * Get overall estimate of storage quota from browser
 */
export async function getStorageEstimate(): Promise<{ usageMB: number; quotaMB: number }> {
  if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usageMB = Math.round(((estimate.usage || 0) / (1024 * 1024)) * 10) / 10;
      const quotaMB = Math.round(((estimate.quota || 0) / (1024 * 1024)) * 10) / 10;
      return { usageMB, quotaMB };
    } catch {
      // Fallback
    }
  }
  return { usageMB: 0.8, quotaMB: 50 };
}

