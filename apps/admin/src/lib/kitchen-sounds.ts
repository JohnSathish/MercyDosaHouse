type SoundType = 'new' | 'priority' | 'overdue' | 'cancelled';

function beep(frequency: number, duration: number, volume = 0.3) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, duration);
  } catch {
    /* ignore */
  }
}

export function playKitchenSound(type: SoundType) {
  switch (type) {
    case 'new':
      beep(880, 150);
      setTimeout(() => beep(1100, 150), 160);
      break;
    case 'priority':
      beep(1200, 100);
      setTimeout(() => beep(1200, 100), 120);
      setTimeout(() => beep(1200, 100), 240);
      break;
    case 'overdue':
      beep(440, 300, 0.4);
      break;
    case 'cancelled':
      beep(330, 400, 0.25);
      break;
  }
}
