/**
 * Voice service handling Text-To-Speech (TTS) and Speech-To-Text (Voice Input)
 * for the worker chatbot.
 */

export interface SpeechItem {
  text: string;
  id?: string;
}

export interface SpeakSequenceOptions {
  onItemStart?: (item: SpeechItem, index: number) => void;
  onItemEnd?: (item: SpeechItem, index: number) => void;
  onComplete?: () => void;
  onError?: (err: any) => void;
}

export interface LipSyncData {
  isSpeaking: boolean;
  mouthOpen: number;      // 0 (closed) to 1.0 (wide open)
  mouthWidth: number;     // 0.8 (pursed/round) to 1.25 (wide)
  jawDrop: number;        // 0 to 1
  viseme: 'A' | 'E' | 'I' | 'O' | 'U' | 'M' | 'F' | 'S' | 'rest';
  currentWord: string;
  volume: number;         // 0 to 1
}

export class VoiceService {
  private synth: SpeechSynthesis | null = null;
  private recognition: any = null;
  private isRecognitionActive = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private currentSessionId = 0;
  private nextTimeout: any = null;
  private isSpeakingState = false;
  private currentSpokenText = '';
  private speakingListeners: Array<(isSpeaking: boolean, text?: string) => void> = [];

  // Lip Sync Real-time State
  private lipSyncData: LipSyncData = {
    isSpeaking: false,
    mouthOpen: 0,
    mouthWidth: 1.0,
    jawDrop: 0,
    viseme: 'rest',
    currentWord: '',
    volume: 0
  };
  private lipSyncListeners: Array<(data: LipSyncData) => void> = [];
  private lipSyncTimer: any = null;
  private currentWordIndex = 0;
  private wordsInCurrentItem: string[] = [];
  private speechStartTime = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoices();
      }
    }
  }

  public subscribeSpeakingState(listener: (isSpeaking: boolean, text?: string) => void): () => void {
    this.speakingListeners.push(listener);
    try {
      listener(this.isSpeakingState, this.currentSpokenText);
    } catch {
      // ignore
    }
    return () => {
      this.speakingListeners = this.speakingListeners.filter((l) => l !== listener);
    };
  }

  public subscribeLipSync(listener: (data: LipSyncData) => void): () => void {
    this.lipSyncListeners.push(listener);
    try {
      listener(this.lipSyncData);
    } catch {
      // ignore
    }
    return () => {
      this.lipSyncListeners = this.lipSyncListeners.filter((l) => l !== listener);
    };
  }

  public getLipSyncData(): LipSyncData {
    return this.lipSyncData;
  }

  private notifyLipSync() {
    this.lipSyncListeners.forEach((listener) => {
      try {
        listener(this.lipSyncData);
      } catch (err) {
        console.error('Error in lip sync listener', err);
      }
    });
  }

  private startLipSyncAnimation(text: string) {
    this.stopLipSyncAnimation();
    this.wordsInCurrentItem = text.split(/\s+/).filter(Boolean);
    this.currentWordIndex = 0;
    this.speechStartTime = performance.now();

    this.lipSyncData = {
      isSpeaking: true,
      mouthOpen: 0.2,
      mouthWidth: 1.0,
      jawDrop: 0.15,
      viseme: 'A',
      currentWord: this.wordsInCurrentItem[0] || '',
      volume: 0.4
    };
    this.notifyLipSync();

    // 60FPS precision syllable animation ticker
    this.lipSyncTimer = setInterval(() => {
      if (!this.isSpeakingState) {
        this.stopLipSyncAnimation();
        return;
      }

      const elapsed = performance.now() - this.speechStartTime;
      const totalWords = this.wordsInCurrentItem.length;
      if (totalWords === 0) return;

      // Estimate word progression (~280ms average per Spanish word at rate 1.05)
      const wordDuration = 270;
      const calculatedWordIdx = Math.min(
        totalWords - 1,
        Math.floor(elapsed / wordDuration)
      );
      this.currentWordIndex = calculatedWordIdx;
      const currentWord = this.wordsInCurrentItem[calculatedWordIdx] || '';

      // Time into the current word (0 to 1)
      const wordProgress = (elapsed % wordDuration) / wordDuration;

      // Detect prominent vowel / syllable rhythm in the current word
      const lower = currentWord.toLowerCase();
      let targetOpen = 0.15;
      let targetWidth = 1.0;
      let targetJaw = 0.1;
      let viseme: LipSyncData['viseme'] = 'A';

      // Determine syllable oscillation inside the word (Spanish syllable cadence)
      // Usually 2-3 syllables per word: cycle with sin curve
      const syllableOsc = Math.sin(wordProgress * Math.PI * 2.5);
      const isMouthPeak = syllableOsc > 0;

      if (isMouthPeak) {
        if (/[aá]/.test(lower)) {
          viseme = 'A';
          targetOpen = 0.82 + syllableOsc * 0.15;
          targetWidth = 1.05;
          targetJaw = 0.78;
        } else if (/[oó]/.test(lower)) {
          viseme = 'O';
          targetOpen = 0.72 + syllableOsc * 0.12;
          targetWidth = 0.85;
          targetJaw = 0.68;
        } else if (/[eé]/.test(lower)) {
          viseme = 'E';
          targetOpen = 0.62 + syllableOsc * 0.12;
          targetWidth = 1.22;
          targetJaw = 0.55;
        } else if (/[iíy]/.test(lower)) {
          viseme = 'I';
          targetOpen = 0.44 + syllableOsc * 0.1;
          targetWidth = 1.25;
          targetJaw = 0.38;
        } else if (/[uú]/.test(lower)) {
          viseme = 'U';
          targetOpen = 0.52 + syllableOsc * 0.1;
          targetWidth = 0.76;
          targetJaw = 0.45;
        } else if (/[mpb]/.test(lower)) {
          viseme = 'M';
          targetOpen = 0.04;
          targetWidth = 0.95;
          targetJaw = 0.05;
        } else {
          viseme = 'S';
          targetOpen = 0.32;
          targetWidth = 1.12;
          targetJaw = 0.25;
        }
      } else {
        // Between syllables: brief transition closure
        targetOpen = 0.12;
        targetWidth = 1.0;
        targetJaw = 0.1;
        viseme = 'rest';
      }

      // Check for pause at commas / periods
      if (/[,;.:]/.test(currentWord) && wordProgress > 0.6) {
        targetOpen = 0.05;
        targetWidth = 1.0;
        targetJaw = 0.04;
        viseme = 'rest';
      }

      // Smooth interpolation for natural lip dynamics
      this.lipSyncData.mouthOpen += (targetOpen - this.lipSyncData.mouthOpen) * 0.42;
      this.lipSyncData.mouthWidth += (targetWidth - this.lipSyncData.mouthWidth) * 0.38;
      this.lipSyncData.jawDrop += (targetJaw - this.lipSyncData.jawDrop) * 0.38;
      this.lipSyncData.viseme = viseme;
      this.lipSyncData.currentWord = currentWord;
      this.lipSyncData.volume = Math.min(1.0, this.lipSyncData.mouthOpen * 1.2);

      this.notifyLipSync();
    }, 20); // 50Hz update rate
  }

  private stopLipSyncAnimation() {
    if (this.lipSyncTimer) {
      clearInterval(this.lipSyncTimer);
      this.lipSyncTimer = null;
    }
    this.lipSyncData = {
      isSpeaking: false,
      mouthOpen: 0,
      mouthWidth: 1.0,
      jawDrop: 0,
      viseme: 'rest',
      currentWord: '',
      volume: 0
    };
    this.notifyLipSync();
  }

  private notifySpeakingState(isSpeaking: boolean, text?: string) {
    this.isSpeakingState = isSpeaking;
    this.currentSpokenText = text || '';
    this.speakingListeners.forEach((listener) => {
      try {
        listener(isSpeaking, text);
      } catch (err) {
        console.error('Error in speaking state listener', err);
      }
    });
  }

  public getIsSpeaking(): boolean {
    return this.isSpeakingState;
  }

  public getCurrentSpokenText(): string {
    return this.currentSpokenText;
  }

  private initVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prioritize natural Spanish voices (es-VE, es-419, es-ES, es-MX, es-US)
    const spanishVoices = voices.filter((v) => v.lang.startsWith('es'));
    this.selectedVoice =
      spanishVoices.find((v) => v.lang.includes('VE')) ||
      spanishVoices.find((v) => v.lang.includes('419')) ||
      spanishVoices.find((v) => v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('sabina') || v.name.toLowerCase().includes('jorge')) ||
      spanishVoices[0] ||
      voices[0] ||
      null;
  }

  /**
   * Cleans markdown and emoji characters so the audio sounds natural.
   */
  public cleanTextForSpeech(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // remove bold
      .replace(/`([^`]+)`/g, '$1') // remove code ticks
      .replace(/•/g, ', ') // replace bullets with pauses
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // remove emojis
      .replace(/\n+/g, '. ') // newline to pause
      .replace(/Bs\./g, 'Bolívares')
      .replace(/IVSS/g, 'I V S S')
      .replace(/FAOV/g, 'F A O V')
      .replace(/LOTTT/g, 'Ley Orgánica del Trabajo')
      .replace(/RPE/g, 'Régimen Prestacional de Empleo')
      .replace(/C\.I\./g, 'Cédula de Identidad')
      .trim();
  }

  /**
   * Speaks a sequence of items one after another with natural pauses.
   */
  public speakSequence(items: SpeechItem[], callbacks?: SpeakSequenceOptions) {
    this.stop();

    if (!this.synth) {
      callbacks?.onError?.('SpeechSynthesis not supported');
      return;
    }

    const validItems = items
      .map((item) => ({ ...item, cleanText: this.cleanTextForSpeech(item.text) }))
      .filter((item) => item.cleanText.length > 0);

    if (validItems.length === 0) {
      callbacks?.onComplete?.();
      return;
    }

    const thisSessionId = this.currentSessionId;

    const playItem = (index: number) => {
      if (thisSessionId !== this.currentSessionId) return;

      if (index >= validItems.length) {
        this.activeUtterance = null;
        this.notifySpeakingState(false);
        callbacks?.onComplete?.();
        return;
      }

      const currentItem = validItems[index];
      const utterance = new SpeechSynthesisUtterance(currentItem.cleanText);
      utterance.lang = 'es-ES';
      utterance.rate = 1.05; // Slightly lively rate
      utterance.pitch = 1.0;

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      this.activeUtterance = utterance;

      utterance.onstart = () => {
        if (thisSessionId !== this.currentSessionId) return;
        this.notifySpeakingState(true, currentItem.cleanText);
        this.startLipSyncAnimation(currentItem.cleanText);
        callbacks?.onItemStart?.(currentItem, index);
      };

      utterance.onboundary = (e: any) => {
        if (thisSessionId !== this.currentSessionId) return;
        if (e.name === 'word') {
          const charIndex = e.charIndex || 0;
          const remaining = currentItem.cleanText.slice(charIndex);
          const match = remaining.match(/^(\S+)/);
          if (match && match[1]) {
            this.lipSyncData.currentWord = match[1];
            // Syllable peak impulse on word boundary
            this.lipSyncData.mouthOpen = Math.min(1.0, this.lipSyncData.mouthOpen + 0.35);
            this.notifyLipSync();
          }
        }
      };

      utterance.onend = () => {
        if (thisSessionId !== this.currentSessionId) return;
        this.stopLipSyncAnimation();
        callbacks?.onItemEnd?.(currentItem, index);
        // Brief natural conversational pause before next message
        this.nextTimeout = setTimeout(() => {
          if (thisSessionId !== this.currentSessionId) return;
          if (index + 1 >= validItems.length) {
            this.notifySpeakingState(false);
          }
          playItem(index + 1);
        }, 220);
      };

      utterance.onerror = (e: any) => {
        if (thisSessionId !== this.currentSessionId) return;
        this.stopLipSyncAnimation();
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          callbacks?.onError?.(e);
        }
        callbacks?.onItemEnd?.(currentItem, index);
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          this.nextTimeout = setTimeout(() => {
            if (thisSessionId !== this.currentSessionId) return;
            playItem(index + 1);
          }, 220);
        }
      };

      try {
        if (this.synth?.paused) {
          this.synth.resume();
        }
        this.synth?.speak(utterance);
      } catch (err) {
        if (thisSessionId !== this.currentSessionId) return;
        callbacks?.onError?.(err);
        callbacks?.onComplete?.();
      }
    };

    playItem(0);
  }

  /**
   * Speaks the given single text using speech synthesis.
   */
  public speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void
  ) {
    this.speakSequence(
      [{ text }],
      {
        onItemStart: () => onStart?.(),
        onItemEnd: () => onEnd?.(),
        onComplete: () => onEnd?.(),
        onError: (err) => onError?.(err)
      }
    );
  }

  /**
   * Stops any currently playing speech and cancels the playback queue.
   */
  public stop() {
    this.currentSessionId++;
    if (this.nextTimeout) {
      clearTimeout(this.nextTimeout);
      this.nextTimeout = null;
    }
    this.activeUtterance = null;
    this.stopLipSyncAnimation();
    this.notifySpeakingState(false);
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {
        // ignore
      }
    }
  }

  /**
   * Checks if speech recognition is supported in this browser.
   */
  public isSpeechRecognitionSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
    );
  }

  /**
   * Starts listening to user voice through microphone.
   */
  public startListening(
    onResult: (transcript: string) => void,
    onEnd: () => void,
    onError: (err: string) => void
  ) {
    if (this.isRecognitionActive) {
      this.stopListening();
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onError('El reconocimiento de voz no está soportado en este navegador.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-VE';
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isRecognitionActive = true;
      };

      this.recognition.onresult = (event: any) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          const transcript = event.results[0][0].transcript;
          onResult(transcript);
        }
      };

      this.recognition.onerror = (event: any) => {
        this.isRecognitionActive = false;
        onError(event.error || 'Error en el micrófono');
      };

      this.recognition.onend = () => {
        this.isRecognitionActive = false;
        onEnd();
      };

      this.recognition.start();
    } catch (e: any) {
      this.isRecognitionActive = false;
      onError(e?.message || 'No se pudo iniciar el micrófono');
    }
  }

  /**
   * Stops listening to microphone.
   */
  public stopListening() {
    if (this.recognition && this.isRecognitionActive) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.isRecognitionActive = false;
    }
  }
}

export const voiceService = new VoiceService();
