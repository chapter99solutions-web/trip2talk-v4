import { WaiverData, WaiverType } from '../types/compliance';
import { initDB } from './expenseDb';

export interface StoredWaiver extends WaiverData {
  id: string;
  tour_id: string;
  language: 'EN' | 'TH';
  waiver_type?: WaiverType;
}

export const saveWaiverLocally = async (waiver: StoredWaiver): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('client_waivers', 'readwrite');
    const req = tx.objectStore('client_waivers').put(waiver);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const getLocalWaiversByClientIds = async (clientIds: string[]): Promise<StoredWaiver[]> => {
  if (clientIds.length === 0) return [];
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('client_waivers', 'readonly');
    const req = tx.objectStore('client_waivers').getAll();
    req.onsuccess = () => {
      const all = (req.result ?? []) as StoredWaiver[];
      const idSet = new Set(clientIds);
      resolve(all.filter((w) => idSet.has(w.client_id)));
    };
    req.onerror = () => reject(req.error);
  });
};
