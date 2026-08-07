/**
 * IndexedDB CRUD wrapper module for the Sketch PWA.
 * Provides full CRUD operations for saved drawings.
 */

const DB_NAME = 'SketchDB';
const STORE_NAME = 'drawings';
const VERSION = 1;

let dbPromise = null;

/**
 * Initialize and cache the IndexedDB database connection
 * @returns {Promise<IDBDatabase>} Promise that resolves with the database connection
 */
async function getDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    
    request.onerror = () => reject(request.error || new Error('Database error'));
    request.onsuccess = (event) => resolve(event.target.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('name', 'name', { unique: false });
        objectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
  });

  return dbPromise;
}

/**
 * Create a new drawing
 * @param {{name: string, strokes: any[], createdAt?: Date}} data - Drawing data
 * @returns {Promise<number>} Promise that resolves with the new drawing ID
 */
export function createDrawing(data) {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const drawing = {
        ...data,
        createdAt: data.createdAt || new Date(),
        updatedAt: new Date()
      };
      
      const request = store.add(drawing);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Failed to add drawing'));
    });
  });
}

/**
 * Get a drawing by ID
 * @param {number} id - Drawing ID
 * @returns {Promise<Object|null>} Promise that resolves with the drawing or null if not found
 */
export function getDrawing(id) {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Failed to get drawing'));
    });
  });
}

/**
 * List all drawings
 * @returns {Promise<Array<{id: number, name: string, updatedAt: Date}>>} Promise that resolves with array of drawings
 */
export function listDrawings() {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        // Return only the required fields
        const result = (request.result || []).map(drawing => ({
          id: drawing.id,
          name: drawing.name,
          updatedAt: drawing.updatedAt
        }));
        resolve(result);
      };
      
      request.onerror = () => reject(request.error || new Error('Failed to list drawings'));
    });
  });
}

/**
 * Update an existing drawing
 * @param {number} id - Drawing ID
 * @param {{name?: string, strokes?: any[]}} data - Data to update
 * @returns {Promise<void>} Promise that resolves when update is complete
 */
export function updateDrawing(id, data) {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Get existing drawing first
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const existingDrawing = getRequest.result;
        
        if (!existingDrawing) {
          reject(new Error('Drawing not found'));
          return;
        }
        
        const updatedDrawing = {
          ...existingDrawing,
          ...data,
          updatedAt: new Date()
        };
        
        const putRequest = store.put(updatedDrawing);
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error || new Error('Failed to update drawing'));
      };
      
      getRequest.onerror = () => reject(getRequest.error || new Error('Failed to get drawing for update'));
    });
  });
}

/**
 * Delete a drawing by ID
 * @param {number} id - Drawing ID
 * @returns {Promise<void>} Promise that resolves when deletion is complete
 */
export function deleteDrawing(id) {
  return getDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Failed to delete drawing'));
    });
  });
}

/**
 * Initialize the database (explicit init function)
 * @returns {Promise<IDBDatabase>} Promise that resolves with the database connection
 */
export function initDB() {
  return getDB();
}

// CommonJS compatibility for Node.js require()
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initDB,
    createDrawing,
    getDrawing,
    listDrawings,
    updateDrawing,
    deleteDrawing
  };
}