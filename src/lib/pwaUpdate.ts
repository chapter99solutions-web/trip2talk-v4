type UpdateReload = () => void;

let pendingReload: UpdateReload | null = null;
const listeners = new Set<(reload: UpdateReload) => void>();

export function notifyPwaUpdateAvailable(reload: UpdateReload) {
  pendingReload = reload;
  for (const listener of listeners) {
    listener(reload);
  }
}

export function subscribePwaUpdateAvailable(listener: (reload: UpdateReload) => void) {
  listeners.add(listener);
  if (pendingReload) {
    listener(pendingReload);
  }
  return () => {
    listeners.delete(listener);
  };
}
