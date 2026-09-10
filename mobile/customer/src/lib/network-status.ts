type Listener = (online: boolean) => void;

let online = true;
const listeners = new Set<Listener>();

export function isNetworkOnline() {
  return online;
}

export function setNetworkOnline(next: boolean) {
  if (online === next) return;
  online = next;
  listeners.forEach((l) => l(online));
}

export function subscribeNetwork(listener: Listener) {
  listeners.add(listener);
  listener(online);
  return () => {
    listeners.delete(listener);
  };
}
