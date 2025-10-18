import { Platform } from 'react-native';

/**
 * Voice Recognition Utility for Expo
 * Uses expo-speech for text-to-speech and provides a speech recognition interface
 */

interface VoiceRecognitionCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onResults?: (results: string[]) => void;
  onError?: (error: any) => void;
}

class VoiceRecognition {
  private callbacks: VoiceRecognitionCallbacks = {};
  private isListening: boolean = false;
  private recognition: any = null;

  constructor() {
    // Initialize Web Speech API for web/Expo
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
      }
    }
  }

  setCallbacks(callbacks: VoiceRecognitionCallbacks) {
    this.callbacks = callbacks;
    
    if (this.recognition) {
      this.recognition.onstart = () => {
        this.isListening = true;
        this.callbacks.onStart?.();
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.callbacks.onEnd?.();
      };

      this.recognition.onresult = (event: any) => {
        const results: string[] = [];
        for (let i = 0; i < event.results.length; i++) {
          results.push(event.results[i][0].transcript);
        }
        this.callbacks.onResults?.(results);
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        this.callbacks.onError?.(event.error);
      };
    }
  }

  async start(): Promise<void> {
    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (error) {
        this.callbacks.onError?.(error);
        throw error;
      }
    } else {
      const error = new Error('Speech recognition not available on this device');
      this.callbacks.onError?.(error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  async destroy(): Promise<void> {
    await this.stop();
    this.callbacks = {};
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  static isAvailable(): boolean {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return !!(
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition
      );
    }
    return false;
  }
}

export default VoiceRecognition;
