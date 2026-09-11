type Listener = (online: boolean) => void;

let online = true;
let failStreak = 0;
const FAIL_STREAK_TO_OFFLINE = 3;
const listeners = new Set<Listener>();

export function isNetworkOnline() {
  return online;
}

export function setNetworkOnline(next: boolean) {
  if (next) {
    failStreak = 0;
    if (online) return;
    online = true;
    listeners.forEach((l) => l(true));
    return;
  }

  failStreak += 1;
  if (failStreak < FAIL_STREAK_TO_OFFLINE || !online) return;
  online = false;
  listeners.forEach((l) => l(false));
}

export function subscribeNetwork(listener: Listener) {
  listeners.add(listener);
  listener(online);
  return () => {
    listeners.delete(listener);
  };
}
