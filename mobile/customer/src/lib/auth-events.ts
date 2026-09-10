export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please log in again.';

type Listener = () => void;

const sessionInvalidated = new Set<Listener>();
const authChanged = new Set<Listener>();

export function subscribeSessionInvalidated(listener: Listener): () => void {
  sessionInvalidated.add(listener);
  return () => {
    sessionInvalidated.delete(listener);
  };
}

export function notifySessionInvalidated() {
  sessionInvalidated.forEach((listener) => {
    try {
      listener();
    } catch {
      /* ignore listener errors */
    }
  });
}

export function subscribeAuthChanged(listener: Listener): () => void {
  authChanged.add(listener);
  return () => {
    authChanged.delete(listener);
  };
}

export function notifyAuthChanged() {
  authChanged.forEach((listener) => {
    try {
      listener();
    } catch {
      /* ignore listener errors */
    }
  });
}
