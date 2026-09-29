"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Header from "@/components/layout/Header";
import { USER_PROGRAMS } from "@/lib/constants";
import { LoyaltyProgram } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { blobToWav } from "@/lib/wav";

const STORAGE_KEY = "optimile_programs";

const TOOL_LABELS: Record<string, { icon: string; label: string }> = {
  search_award_availability: { icon: "🔍", label: "Searching live award seats" },
  get_transfer_partners: { icon: "💳", label: "Checking RevPoints transfer partners" },
  get_status_matches: { icon: "⭐", label: "Checking open status matches" },
  value_redemption: { icon: "🧮", label: "Computing cents-per-point" },
  evaluate_points_purchase: { icon: "🛒", label: "Pricing the shortfall" },
  web_search: { icon: "🌐", label: "Looking up cash fares" },
};

const EXAMPLES = [
  "I'm in San Francisco. Get me home to Europe — what's the best use of my points?",
  "What's the best cabin I can actually afford out of SFO, and which program should pay for it?",
  "Should I transfer my RevPoints, or keep them?",
  "My Finnair status match deadline — is it worth chasing?",
];

type ToolCall = { id: string; name: string; input: unknown; output?: string };
type Turn = {
  role: "user" | "assistant";
  text: string;
  thinking?: string;
  tools?: ToolCall[];
  error?: string;
};

function loadPrograms(): LoyaltyProgram[] {
  if (typeof window === "undefined") return USER_PROGRAMS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return USER_PROGRAMS;
    const parsed = JSON.parse(saved) as LoyaltyProgram[];
    return USER_PROGRAMS.map((def) => {
      const hit = parsed.find((p) => p.id === def.id);
      return hit ? { ...def, balance: hit.balance, lastUpdated: hit.lastUpdated } : def;
    });
  } catch {
    return USER_PROGRAMS;
  }
}

function isHttpUrl(candidate: string): boolean {
  try {
    const parsed = new URL(candidate.replace(/&amp;/g, "&"));
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Minimal markdown → HTML: headings, bold, bullets, paragraphs. Enough for agent output. */
function renderMarkdown(md: string): string {
  // Quotes MUST be escaped too. The link rule below interpolates a captured URL
  // into a double-quoted href, so an unescaped " in that URL closes the attribute
  // and everything after it becomes live attributes on the <a> — an onmouseover
  // handler, for instance. The agent's answers can carry text lifted from web
  // search results, so this input is not trustworthy.
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const lines = escaped.split("\n");
  const out: string[] = [];
  let inList = false;

  const inline = (s: string) =>
    s
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-card text-[0.85em]">$1</code>')
      // Character class excludes quotes and whitespace as a second line of defence,
      // and the href is only emitted once the URL parses as http(s).
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)"'\s]+)\)/g, (match, label: string, url: string) =>
        isHttpUrl(url)
          ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-accent underline">${label}</a>`
          : label
      );

  const cells = (row: string) =>
    row
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table: a pipe row followed by a |---|---| separator row.
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? "")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      const head = cells(line);
      const body: string[][] = [];
      let j = i + 2;
      while (j < lines.length && /^\s*\|.*\|\s*$/.test(lines[j])) {
        body.push(cells(lines[j]));
        j++;
      }
      i = j - 1;

      out.push('<div class="overflow-x-auto my-3">');
      out.push('<table class="w-full text-sm border border-border rounded-lg border-separate border-spacing-0">');
      out.push(
        `<thead><tr>${head
          .map(
            (c) =>
              `<th class="text-left font-semibold px-3 py-2 bg-card border-b border-border">${inline(c)}</th>`
          )
          .join("")}</tr></thead><tbody>`
      );
      for (const row of body) {
        out.push(
          `<tr>${row
            .map((c) => `<td class="px-3 py-2 border-b border-border align-top">${inline(c)}</td>`)
            .join("")}</tr>`
        );
      }
      out.push("</tbody></table></div>");
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      if (!inList) {
        out.push('<ul class="list-disc pl-5 space-y-1 my-2">');
        inList = true;
      }
      out.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }
    if (inList) {
      out.push("</ul>");
      inList = false;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const size = heading[1].length <= 2 ? "text-lg" : "text-base";
      out.push(`<h3 class="${size} font-semibold mt-4 mb-1">${inline(heading[2])}</h3>`);
      continue;
    }

    if (line.trim() === "") continue;
    out.push(`<p class="my-2 leading-relaxed">${inline(line)}</p>`);
  }
  if (inList) out.push("</ul>");
  return out.join("");
}

export default function AskPage() {
  const [programs, setPrograms] = useState<LoyaltyProgram[]>(USER_PROGRAMS);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPrograms(loadPrograms());
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  const enteredBalances = programs.filter((p) => p.balance > 0);
  const totalPoints = programs.reduce((sum, p) => sum + p.balance, 0);

  const ask = useCallback(
    async (question: string) => {
      if (!question.trim() || busy) return;
      setBusy(true);
      setInput("");

      const history: { role: "user" | "assistant"; content: string }[] = turns
        .filter((t) => t.text.trim().length > 0)
        .map((t) => ({ role: t.role, content: t.text }));
      history.push({ role: "user", content: question });

      setTurns((prev) => [
        ...prev,
        { role: "user", text: question },
        { role: "assistant", text: "", tools: [] },
      ]);

      const patchLast = (fn: (turn: Turn) => Turn) =>
        setTurns((prev) => {
          const next = [...prev];
          next[next.length - 1] = fn(next[next.length - 1]);
          return next;
        });

      try {
        const response = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, programs }),
        });

        if (!response.ok || !response.body) {
          const detail = await response.text();
          patchLast((t) => ({ ...t, error: detail || `HTTP ${response.status}` }));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";

          for (const chunk of chunks) {
            const line = chunk.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            const event = JSON.parse(line.slice(6));

            if (event.type === "text") {
              patchLast((t) => ({ ...t, text: t.text + event.delta }));
            } else if (event.type === "thinking") {
              patchLast((t) => ({ ...t, thinking: (t.thinking ?? "") + event.delta }));
            } else if (event.type === "tool_start") {
              patchLast((t) => ({
                ...t,
                tools: [...(t.tools ?? []), { id: event.id, name: event.name, input: event.input }],
              }));
            } else if (event.type === "tool_end") {
              patchLast((t) => ({
                ...t,
                tools: (t.tools ?? []).map((c) =>
                  c.id === event.id ? { ...c, output: event.output } : c
                ),
              }));
            } else if (event.type === "error") {
              patchLast((t) => ({ ...t, error: event.message }));
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Request failed";
        patchLast((t) => ({ ...t, error: message }));
      } finally {
        setBusy(false);
      }
    },
    [busy, programs, turns]
  );

  /** Records in the browser, sends the clip to Plaud for transcription, then asks the agent. */
  const toggleRecording = useCallback(async () => {
    setVoiceError(null);

    if (recording) {
      recorderRef.current?.stop();
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(mediaStream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = async () => {
        mediaStream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setTranscribing(true);
        try {
          // Chrome records webm, which Plaud rejects — re-encode to WAV first.
          const recorded = new Blob(chunks, { type: recorder.mimeType });
          const wav = await blobToWav(recorded);
          const form = new FormData();
          form.append("audio", wav, "question.wav");

          const response = await fetch("/api/voice", { method: "POST", body: form });
          const payload = await response.json();

          if (!response.ok) {
            setVoiceError(payload.error ?? `Transcription failed (${response.status})`);
            return;
          }
          if (payload.text) ask(payload.text);
        } catch (error) {
          setVoiceError(error instanceof Error ? error.message : "Transcription failed");
        } finally {
          setTranscribing(false);
        }
      };

      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setVoiceError("Microphone access denied — check browser permissions.");
    }
  }, [recording, ask]);

  return (
    <div className="flex flex-col h-full max-w-4xl">
      <Header
        title="Ask Optimile"
        subtitle="Describe the trip you want. The agent checks live award space, transfer options and cash fares, then tells you the best way to pay for it."
      />

      {/* Portfolio context strip — makes it visible that the agent is grounded in real holdings */}
      <div className="mb-5 rounded-xl border border-border bg-card px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="font-medium">Reasoning over:</span>
        {enteredBalances.length === 0 ? (
          <span className="text-amber-600">
            No balances entered yet — add them on the Dashboard for specific answers.
          </span>
        ) : (
          <>
            {enteredBalances.map((p) => (
              <span key={p.id} className="flex items-center gap-1.5">
                <span>{p.icon}</span>
                <span className="text-muted">{p.shortName}</span>
                <span className="font-semibold tabular-nums">{formatNumber(p.balance)}</span>
              </span>
            ))}
            <span className="ml-auto text-muted">
              {formatNumber(totalPoints)} points total · {programs.filter((p) => p.statusTier).length} statuses
            </span>
          </>
        )}
      </div>

      {turns.length === 0 && (
        <div className="grid sm:grid-cols-2 gap-3 mb-6">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              onClick={() => ask(example)}
              className="text-left text-sm p-4 rounded-xl border border-border hover:border-accent hover:bg-accent-light transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 space-y-6">
        {turns.map((turn, i) =>
          turn.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent text-white px-4 py-2.5 text-sm">
                {turn.text}
              </div>
            </div>
          ) : (
            <div key={i} className="space-y-3">
              {(turn.tools ?? []).map((call) => {
                const meta = TOOL_LABELS[call.name] ?? { icon: "🔧", label: call.name };
                return (
                  <details
                    key={call.id}
                    className="rounded-lg border border-border bg-card text-sm overflow-hidden"
                  >
                    <summary className="px-3 py-2 cursor-pointer flex items-center gap-2 select-none">
                      <span>{meta.icon}</span>
                      <span className={cn(!call.output && "text-muted")}>{meta.label}</span>
                      {call.output ? (
                        <span className="ml-auto text-emerald-600 text-xs">done</span>
                      ) : (
                        <span className="ml-auto text-xs text-muted animate-pulse">running…</span>
                      )}
                    </summary>
                    <div className="px-3 pb-3 space-y-2">
                      <pre className="text-[11px] overflow-x-auto bg-background rounded p-2 border border-border">
                        {JSON.stringify(call.input, null, 2)}
                      </pre>
                      {call.output && (
                        <pre className="text-[11px] overflow-x-auto max-h-48 bg-background rounded p-2 border border-border">
                          {call.output.slice(0, 4000)}
                        </pre>
                      )}
                    </div>
                  </details>
                );
              })}

              {turn.thinking && !turn.text && (
                <details className="rounded-lg border border-border bg-card text-sm">
                  <summary className="px-3 py-2 cursor-pointer text-muted select-none">
                    💭 Thinking…
                  </summary>
                  <p className="px-3 pb-3 text-xs whitespace-pre-wrap text-muted">{turn.thinking}</p>
                </details>
              )}

              {turn.text && (
                <div
                  className="text-sm"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(turn.text) }}
                />
              )}

              {!turn.text && !turn.tools?.length && !turn.error && (
                <p className="text-sm text-muted animate-pulse">Thinking…</p>
              )}

              {turn.error && (
                <p className="text-sm rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2">
                  {turn.error}
                </p>
              )}
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="sticky bottom-0 bg-background pt-4 pb-2 mt-4"
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggleRecording}
            disabled={busy || transcribing}
            title={recording ? "Stop and transcribe" : "Ask out loud — transcribed by Plaud"}
            className={cn(
              "px-4 py-3 rounded-xl border text-sm font-medium transition-colors disabled:opacity-40",
              recording
                ? "border-red-300 bg-red-50 text-red-600"
                : "border-border bg-card hover:border-accent hover:text-accent"
            )}
          >
            {recording ? "◼ Stop" : transcribing ? "…" : "🎙"}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              recording
                ? "Listening… tell me what points you have and where you want to go"
                : transcribing
                  ? "Transcribing with Plaud…"
                  : "Where do you want to go?"
            }
            disabled={busy || recording || transcribing}
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-accent disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="px-5 py-3 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-40"
          >
            {busy ? "Working…" : "Ask"}
          </button>
        </div>
        {voiceError && (
          <p className="mt-2 text-xs rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2">
            {voiceError}
          </p>
        )}
      </form>
    </div>
  );
}
