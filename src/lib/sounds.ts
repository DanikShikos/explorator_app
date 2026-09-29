"use client";

let context: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined") {
    return null;
  }
  context ??= new AudioContext();
  if (context.state === "suspended") {
    void context.resume();
  }
  return context;
}

function tone(frequency: number, duration: number, type: OscillatorType, volume = 0.05) {
  const ctx = audio();
  if (!ctx) {
    return;
  }
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  oscillator.stop(ctx.currentTime + duration);
}

export function playCorrect() {
  tone(660, 0.12, "sine");
  window.setTimeout(() => tone(880, 0.16, "sine"), 90);
}

export function playWrong() {
  tone(196, 0.22, "sawtooth", 0.03);
}

export function playHeartLoss() {
  tone(140, 0.28, "triangle", 0.06);
}

export function playWin() {
  [523, 659, 784, 1046].forEach((frequency, index) => {
    window.setTimeout(() => tone(frequency, 0.18, "sine", 0.05), index * 120);
  });
}
