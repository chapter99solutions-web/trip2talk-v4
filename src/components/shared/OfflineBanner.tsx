import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="sticky top-0 z-50 bg-[#FAEEDA] border-b border-[#EF9F27] px-4 py-2 text-xs text-[#633806] flex items-center gap-2">
      <span>📵</span>
      <span>
        ไม่มีสัญญาณอินเทอร์เน็ต — แสดงข้อมูลที่แคชไว้ในเครื่อง (ตารางทริปและจุดนัดหมายยังดูได้ครับ)
      </span>
    </div>
  );
}
