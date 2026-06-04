import { useEffect, useRef, useState } from 'react';
import { subscribePwaUpdateAvailable } from '../../lib/pwaUpdate';

export default function UpdateToast() {
  const [visible, setVisible] = useState(false);
  const reloadRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return subscribePwaUpdateAvailable((reload) => {
      reloadRef.current = reload;
      setVisible(true);
    });
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-0 right-0 z-[70] flex justify-center px-4 pointer-events-none">
      <button
        type="button"
        onClick={() => reloadRef.current?.()}
        className="pointer-events-auto max-w-md w-full rounded-full border border-amber-400/40 bg-neutral-950/95 text-amber-100 px-4 py-2.5 text-sm font-medium shadow-lg shadow-black/30 backdrop-blur hover:bg-neutral-900 transition-colors"
      >
        🔄 New version available — tap to update
      </button>
    </div>
  );
}
