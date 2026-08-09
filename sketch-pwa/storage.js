let dbInstance = null;

async function initDB() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = globalThis.indexedDB.open("sketch-pwa", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("drawings")) {
        db.createObjectStore("drawings", { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

async function createDrawing({ name, strokes }) {
  const db = await initDB();
  const record = {
    name,
    strokes,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("drawings", "readwrite");
    const store = transaction.objectStore("drawings");
    const request = store.add(record);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getDrawing(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("drawings", "readonly");
    const store = transaction.objectStore("drawings");
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function listDrawings() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("drawings", "readonly");
    const store = transaction.objectStore("drawings");
    const request = store.openCursor();
    const results = [];

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const { id, name, updatedAt } = cursor.value;
        results.push({ id, name, updatedAt });
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

async function updateDrawing(id, { name, strokes }) {
  const db = await initDB();
  const transaction = db.transaction("drawings", "readwrite");
  const store = transaction.objectStore("drawings");

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const existing = getRequest.result;
      if (!existing) {
        reject(new Error("Drawing not found"));
        return;
      }

      const updated = {
        ...existing,
        ...(name !== undefined && { name }),
        ...(strokes !== undefined && { strokes }),
        updatedAt: Date.now()
      };

      const putRequest = store.put(updated);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

async function deleteDrawing(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("drawings", "readwrite");
    const store = transaction.objectStore("drawings");
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

const SketchStorage = {
  initDB,
  createDrawing,
  getDrawing,
  listDrawings,
  updateDrawing,
  deleteDrawing
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SketchStorage;
} else {
  globalThis.SketchStorage = SketchStorage;
}
