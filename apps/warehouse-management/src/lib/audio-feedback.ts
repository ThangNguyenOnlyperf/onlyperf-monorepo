// Audio feedback utility for QR scanner

class AudioFeedback {
  private successSound: HTMLAudioElement | null = null;
  private errorSound: HTMLAudioElement | null = null;
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    try {
      // Create success sound (pleasant ding)
      this.successSound = new Audio();
      this.successSound.src = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAADhfX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19';
      this.successSound.volume = 0.3;

      // Create error sound (subtle buzz)
      this.errorSound = new Audio();
      this.errorSound.src = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAADhwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA';
      this.errorSound.volume = 0.2;

      this.isInitialized = true;
    } catch (error) {
      console.warn('Failed to initialize audio feedback:', error);
    }
  }

  async playSuccess() {
    if (!this.isInitialized || !this.successSound) return;
    
    try {
      // Reset the audio to start
      this.successSound.currentTime = 0;
      await this.successSound.play();
    } catch (error) {
      console.warn('Failed to play success sound:', error);
    }
  }

  async playError() {
    if (!this.isInitialized || !this.errorSound) return;
    
    try {
      // Reset the audio to start
      this.errorSound.currentTime = 0;
      await this.errorSound.play();
    } catch (error) {
      console.warn('Failed to play error sound:', error);
    }
  }

  setVolume(volume: number) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    if (this.successSound) {
      this.successSound.volume = clampedVolume * 0.3; // Max 30% for success
    }
    
    if (this.errorSound) {
      this.errorSound.volume = clampedVolume * 0.2; // Max 20% for error
    }
  }

  mute() {
    this.setVolume(0);
  }

  unmute() {
    this.setVolume(1);
  }
}

// Create singleton instance
const audioFeedback = new AudioFeedback();

// Export functions
export const playSuccessSound = () => audioFeedback.playSuccess();
export const playErrorSound = () => audioFeedback.playError();
export const setAudioVolume = (volume: number) => audioFeedback.setVolume(volume);
export const muteAudio = () => audioFeedback.mute();
export const unmuteAudio = () => audioFeedback.unmute();

// Alternative approach using Web Audio API for more control
export async function playTone(frequency: number, duration = 200, volume = 0.3) {
  if (typeof window === 'undefined' || !window.AudioContext) return;
  
  try {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    gainNode.gain.value = volume;
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (error) {
    console.warn('Failed to play tone:', error);
  }
}

// Predefined tones
export const playSuccessTone = () => playTone(800, 150, 0.3); // High pleasant tone
export const playErrorTone = () => playTone(300, 200, 0.2); // Low error tone