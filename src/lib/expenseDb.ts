import { Expense } from '../types/tour';
const DB_NAME = 'Trip2Talk_Offline_DB';
export const initDB = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, 3);
  req.onsuccess = () => resolve(req.result);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains('receipts')) db.createObjectStore('receipts', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('expense_metadata')) db.createObjectStore('expense_metadata', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('client_waivers')) db.createObjectStore('client_waivers', { keyPath: 'id' });
  };
});
export const saveExpenseLocally = async (expense: Expense, blob: Blob): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction(['receipts', 'expense_metadata'], 'readwrite');
    tx.objectStore('receipts').put({ id: expense.id, blob });
    tx.objectStore('expense_metadata').put({ ...expense, is_synced: false });
    tx.oncomplete = () => resolve();
  });
};
export const getAllLocalExpenses = async (): Promise<Expense[]> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction('expense_metadata', 'readonly');
    const req = tx.objectStore('expense_metadata').getAll();
    req.onsuccess = () => resolve(req.result || []);
  });
};
