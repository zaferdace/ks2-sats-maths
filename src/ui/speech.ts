// Spelling dictation with the browser's own voices (Web Speech API), in a British voice when the
// device has one. iPadOS only speaks after a tap, so every call must come from a click handler.

export const canSpeak = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

let chosen: SpeechSynthesisVoice | null = null;

/** Natural British voices on Apple devices, best first. */
const PREFERRED = ['Daniel', 'Serena', 'Kate', 'Arthur', 'Martha', 'Oliver', 'Stephanie'];

function britishVoice(): SpeechSynthesisVoice | null {
  if (chosen) return chosen;
  const voices = window.speechSynthesis.getVoices();
  const lang = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase();
  const gb = voices.filter((v) => lang(v) === 'en-gb');
  // Names like "Grandma (English (United Kingdom))" are novelty voices that sound robotic;
  // "Daniel (Enhanced)" and "Serena (Premium)" are the better downloads of the normal ones.
  const plain = gb.filter((v) => !v.name.includes('(English'));
  const quality = (v: SpeechSynthesisVoice) => (/Premium/.test(v.name) ? 0 : /Enhanced/.test(v.name) ? 1 : 2);
  const named = PREFERRED.map((n) =>
    plain.filter((v) => v.name.startsWith(n)).sort((a, b) => quality(a) - quality(b))[0],
  ).find(Boolean);
  chosen = named ?? plain[0] ?? gb[0] ?? voices.find((v) => lang(v).startsWith('en')) ?? null;
  return chosen;
}

if (canSpeak()) {
  // Some browsers load their voice list late.
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    chosen = null;
  });
}

/** Speaks the lines one after another, replacing anything still being said. */
export function speak(lines: string[], rate = 0.85): void {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  if (synth.speaking || synth.pending) synth.cancel();
  const voice = britishVoice();
  for (const text of lines) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice?.lang ?? 'en-GB';
    if (voice) u.voice = voice;
    u.rate = rate;
    synth.speak(u);
  }
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}

/** The way a spelling test is read aloud: the word, the sentence, then the word again. */
export const dictate = (word: string, sentence: string): void =>
  speak([`The word is: ${word}.`, sentence, `The word is: ${word}.`]);

export const sayWord = (word: string, slowly = false): void => speak([word], slowly ? 0.55 : 0.85);
