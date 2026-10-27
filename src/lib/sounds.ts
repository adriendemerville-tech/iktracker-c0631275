// Simple notification sound using Web Audio API
// No external dependencies required

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export function playNotificationSound(type: "success" | "subtle" | "alert" = "subtle") {
  try {
    const ctx = getAudioContext();

    // Resume context if suspended (required for mobile)
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case "success":
        // Two-tone ascending chime
        oscillator.frequency.setValueAtTime(523.25, now); // C5
        oscillator.frequency.setValueAtTime(659.25, now + 0.1); // E5
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        break;

      case "alert":
        // Attention-grabbing double beep
        oscillator.frequency.setValueAtTime(880, now); // A5
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.setValueAtTime(0, now + 0.1);
        gainNode.gain.setValueAtTime(0.2, now + 0.15);
        gainNode.gain.setValueAtTime(0.01, now + 0.25);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        break;

      case "subtle":
      default:
        // Soft, gentle notification tone
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(587.33, now); // D5 - pleasant frequency

        // Soft attack and decay envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.08, now + 0.05); // Soft attack
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25); // Gentle decay

        oscillator.start(now);
        oscillator.stop(now + 0.3);
        break;
    }

    // Cleanup
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };
  } catch (error) {
    console.warn("Could not play notification sound:", error);
  }
}

let zoneAlertsMuted = false;

/** Silence zone cues without hiding the on-screen banner. */
export function setZoneAlertsMuted(muted: boolean) {
  zoneAlertsMuted = muted;
}

export function areZoneAlertsMuted() {
  return zoneAlertsMuted;
}

/**
 * Call from the tap that starts a tour. iOS and Android PWAs ignore later
 * sounds unless playback was unlocked inside a user gesture.
 */
export function unlockAlertAudio(): void {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) {
      try {
        session.type = "playback";
      } catch {
        // Older browsers expose the object but reject the assignment.
      }
    }

    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch (error) {
    console.warn("Could not unlock audio:", error);
  }
}

function playBell(ctx: AudioContext) {
  const now = ctx.currentTime;
  const fundamental = 830;
  const partials = [1, 2, 2.76, 3.2, 4.07];
  const levels = [0.12, 0.06, 0.04, 0.025, 0.015];
  partials.forEach((ratio, index) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(fundamental * ratio, now);
    gainNode.gain.setValueAtTime(levels[index], now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 1.2);
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };
  });
}

/** Two soft descending notes: a confirmation that the section is over. */
function playZoneLeave(ctx: AudioContext) {
  const now = ctx.currentTime;
  const notes = [659.25, 523.25];
  notes.forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const start = now + index * 0.16;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.exponentialRampToValueAtTime(0.1, start + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.001, start + 0.38);
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.4);
    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };
  });
}

export function playZoneAlert(kind: "enter" | "exit") {
  if (zoneAlertsMuted) return;
  try {
    const ctx = getAudioContext();
    const start = () => {
      if (kind === "enter") {
        playBell(ctx);
        try {
          navigator.vibrate?.([120, 60, 120]);
        } catch {
          // Vibration is refused by some browsers; the sound still plays.
        }
      } else {
        playZoneLeave(ctx);
      }
    };
    if (ctx.state === "suspended") {
      void ctx
        .resume()
        .then(start)
        .catch(() => {});
      return;
    }
    start();
  } catch (error) {
    console.warn("Could not play zone alert:", error);
  }
}

// Play a custom frequency tone
export function playTone(frequency: number, duration: number = 0.2, volume: number = 0.1) {
  try {
    const ctx = getAudioContext();

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);

    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };
  } catch (error) {
    console.warn("Could not play tone:", error);
  }
}
