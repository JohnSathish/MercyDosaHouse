type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeSessionInvalidated(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifySessionInvalidated() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* ignore listener errors */
    }
  });
}
