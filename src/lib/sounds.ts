// Simple notification sound using Web Audio API
// No external dependencies required

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export function playNotificationSound(type: 'success' | 'subtle' | 'alert' = 'subtle') {
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended (required for mobile)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'success':
        // Two-tone ascending chime
        oscillator.frequency.setValueAtTime(523.25, now); // C5
        oscillator.frequency.setValueAtTime(659.25, now + 0.1); // E5
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        break;

      case 'alert':
        // Attention-grabbing double beep
        oscillator.frequency.setValueAtTime(880, now); // A5
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.setValueAtTime(0, now + 0.1);
        gainNode.gain.setValueAtTime(0.2, now + 0.15);
        gainNode.gain.setValueAtTime(0.01, now + 0.25);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        break;

      case 'subtle':
      default:
        // Soft, gentle notification tone
        oscillator.type = 'sine';
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
    console.warn('Could not play notification sound:', error);
  }
}

// Play a custom frequency tone
export function playTone(frequency: number, duration: number = 0.2, volume: number = 0.1) {
  try {
    const ctx = getAudioContext();
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
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
    console.warn('Could not play tone:', error);
  }
}
