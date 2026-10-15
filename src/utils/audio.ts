// Audio and Web Speech synthesizer for MarketAI Radar

class SoundEngine {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private voiceEnabled: boolean = true;
  private volume: number = 0.7;
  private playedAlertIds: Set<string> = new Set();

  constructor() {
    // Load preferences from localStorage if available
    try {
      const savedSound = localStorage.getItem('marketai_sound_enabled');
      if (savedSound !== null) this.soundEnabled = savedSound === 'true';

      const savedVoice = localStorage.getItem('marketai_voice_enabled');
      if (savedVoice !== null) this.voiceEnabled = savedVoice === 'true';

      const savedVol = localStorage.getItem('marketai_volume');
      if (savedVol !== null) this.volume = parseFloat(savedVol);
    } catch {}
  }

  private getAudioContext(): AudioContext | null {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    localStorage.setItem('marketai_sound_enabled', String(enabled));
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
    localStorage.setItem('marketai_voice_enabled', String(enabled));
  }

  public isVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('marketai_volume', String(this.volume));
  }

  public getVolume(): number {
    return this.volume;
  }

  public playBuyBeep() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Tone 1: 660 Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(660, now);
      gain1.gain.setValueAtTime(this.volume * 0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.13);

      // Tone 2: 880 Hz
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.14);
      gain2.gain.setValueAtTime(this.volume * 0.45, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.14);
      osc2.stop(now + 0.29);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  public playSellBeep() {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Tone 1: 880 Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(this.volume * 0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.11);

      // Tone 2: 660 Hz
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(660, now + 0.12);
      gain2.gain.setValueAtTime(this.volume * 0.4, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.23);

      // Tone 3: 440 Hz
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(440, now + 0.24);
      gain3.gain.setValueAtTime(this.volume * 0.45, now + 0.24);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.24);
      osc3.stop(now + 0.39);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  public speak(text: string) {
    if (!this.voiceEnabled) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.05;
        utterance.volume = this.volume;

        // Try selecting pt-BR voice if available
        const voices = window.speechSynthesis.getVoices();
        const ptVoice = voices.find(v => v.lang.startsWith('pt'));
        if (ptVoice) utterance.voice = ptVoice;

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech error:', e);
      }
    }
  }

  public playReversalChime(type: 'BULLISH' | 'BEARISH') {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      if (type === 'BULLISH') {
        // Triumphant ascending harmonic alert for Bullish Reversal ("Fim de Baixa")
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(this.volume * 0.45, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.16);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.17);
        });
      } else {
        // Urgent descending harmonic alert for Bearish Reversal ("Fim de Alta")
        const freqs = [987.77, 783.99, 587.33, 440.00]; // B5, G5, D5, A4
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(this.volume * 0.45, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.19);
        });
      }
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  public triggerReversalAlert(alertId: string, symbol: string, type: 'BULLISH' | 'BEARISH', price?: number) {
    if (this.playedAlertIds.has(alertId)) {
      return;
    }
    this.playedAlertIds.add(alertId);

    if (this.playedAlertIds.size > 200) {
      const iter = this.playedAlertIds.values();
      this.playedAlertIds.delete(iter.next().value!);
    }

    this.playReversalChime(type);
    setTimeout(() => {
      const actionText = type === 'BULLISH' ? 'compra' : 'venda';
      this.speak(`Atenção: Candle branco de reversão em ${symbol}! Efetuar entrada imediata de ${actionText} agora!`);
    }, 400);
  }

  public triggerSignalAlert(alertId: string, symbol: string, direction: 'BUY' | 'SELL') {
    if (this.playedAlertIds.has(alertId)) {
      return; // Already played for this unique confirmed signal event!
    }
    this.playedAlertIds.add(alertId);

    // Keep size bounded
    if (this.playedAlertIds.size > 200) {
      const iter = this.playedAlertIds.values();
      this.playedAlertIds.delete(iter.next().value!);
    }

    if (direction === 'BUY') {
      this.playBuyBeep();
      setTimeout(() => {
        this.speak(`Alerta de compra em ${symbol}`);
      }, 400);
    } else if (direction === 'SELL') {
      this.playSellBeep();
      setTimeout(() => {
        this.speak(`Alerta de venda em ${symbol}`);
      }, 500);
    }
  }
}

export const soundEngine = new SoundEngine();
