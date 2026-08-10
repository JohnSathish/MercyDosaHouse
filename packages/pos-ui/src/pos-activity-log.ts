import type { PosApiClient } from './pos-workspace';

export type PosSecurityAction =
  | 'POS_SETTINGS_OPENED'
  | 'POS_SETTINGS_UPDATED'
  | 'POS_LOCK'
  | 'POS_UNLOCK'
  | 'POS_UNLOCK_FAILED'
  | 'POS_LOGOUT'
  | 'POS_LOGOUT_FAILED'
  | 'POS_LOGOUT_BLOCKED';

export async function logPosActivity(
  api: PosApiClient,
  action: PosSecurityAction,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await api.post('/pos/security/log', { action, metadata });
  } catch {
    // Best-effort — never block POS workflow
  }
}

export function playPosSound(enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // ignore
  }
}
