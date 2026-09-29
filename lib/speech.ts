/**
 * Browser speech recognition.
 *
 * The Plaud Embedded path needs a device bound through their native SDK, which a
 * web build cannot do, so voice input runs on the browser's own recogniser
 * instead: no API key, no upload, no server round-trip, and the transcript
 * appears while the user is still speaking.
 *
 * Chrome and Edge implement this as `webkitSpeechRecognition`. Safari and Firefox
 * do not, so `isSpeechSupported()` gates the UI rather than letting the button
 * fail silently.
 */

interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResult {
  readonly length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent {
  error: string;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function constructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechSupported(): boolean {
  return constructor() !== null;
}

export interface SpeechHandlers {
  /** Fires continuously: the confirmed text so far plus the in-progress phrase. */
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access was denied — allow it in the browser's address bar.",
  "service-not-allowed": "Speech recognition was blocked by the browser.",
  "no-speech": "Didn't catch anything — try again and speak a little closer.",
  network: "Speech recognition needs a network connection.",
  aborted: "",
};

/** Starts listening. Returns a stop function, or null if unsupported. */
export function startSpeechRecognition(handlers: SpeechHandlers): (() => void) | null {
  const Recognition = constructor();
  if (!Recognition) return null;

  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  // Results arrive as a growing list; anything already final stays final, so the
  // confirmed text is accumulated separately from the phrase still being revised.
  let settled = "";

  recognition.onresult = (event) => {
    let pending = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0]?.transcript ?? "";
      if (result.isFinal) settled += text;
      else pending += text;
    }
    handlers.onTranscript((settled + pending).replace(/\s+/g, " ").trim(), pending === "");
  };

  recognition.onerror = (event) => {
    const message = ERROR_MESSAGES[event.error] ?? `Speech recognition failed (${event.error})`;
    if (message) handlers.onError(message);
  };

  recognition.onend = () => handlers.onEnd();

  recognition.start();

  return () => {
    recognition.onend = null;
    recognition.stop();
  };
}
