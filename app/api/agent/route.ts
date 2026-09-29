import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { AGENT_TOOLS, WEB_SEARCH_TOOL, executeTool, portfolioSummary } from "@/lib/agent-tools";
import { USER_PROGRAMS } from "@/lib/constants";
import { LoyaltyProgram } from "@/lib/types";

export const maxDuration = 300;

const MODEL = "claude-opus-5";
const MAX_ITERATIONS = 12;

function systemPrompt(programs: LoyaltyProgram[]): string {
  return `You are Optimile, an award-travel strategist. You turn a messy pile of loyalty points into one clear recommendation.

Today is ${new Date().toISOString().slice(0, 10)}.

THE USER'S PORTFOLIO
${portfolioSummary(programs)}

HOW YOU WORK
1. Read what the user actually wants — a destination, a date range, a cabin, or just "what can I do with these points".
2. Check reality before recommending: call search_award_availability for live seats, get_transfer_partners when flexible points might beat a direct balance, get_status_matches when status or lounge access is in play.
3. Anchor the cash side. Use web_search to find what the same ticket costs in cash right now — a cents-per-point number without a real cash fare is meaningless.
4. Run the numbers through value_redemption. Never compute cents-per-point in your head; the tool is the single source of arithmetic truth.
5. Recommend ONE best option, then name the runner-up and say what makes it second.

RULES
- The user is based in Tallinn. seats.aero barely covers TLL, so when a TLL search comes back empty, re-run it from Helsinki, Riga, Copenhagen, Stockholm, Warsaw or Frankfurt before telling the user there is nothing — and say which hub the recommendation departs from.
- Award rows carry lastSeenByProvider. If that date is more than a week old, call it cached rather than live.
- All money you quote to the user is in EUR. seats.aero taxes arrive in taxesCurrency (often USD/CAD) — convert them, and say you converted.
- If a balance is not entered, say so and reason about what WOULD be possible, rather than inventing a number.
- Transfers are usually one-way and irreversible. Say so whenever you suggest one.
- Award space changes hourly. If seats are scarce, say how many are left.
- If a tool returns an error, tell the user plainly what failed. Never fill the gap with a plausible-sounding guess.
- Quote real numbers: miles, taxes in EUR, cash fare, cpp. Round money to whole euros.

STYLE
Write like a knowledgeable friend, not a brochure. Short paragraphs. Lead with the answer, then the reasoning. Use markdown headings and bullets. End with a single concrete next action.`;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = (await request.json()) as {
    messages: Anthropic.MessageParam[];
    programs?: LoyaltyProgram[];
  };
  const programs = body.programs?.length ? body.programs : USER_PROGRAMS;

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      const messages: Anthropic.MessageParam[] = [...body.messages];

      try {
        for (let i = 0; i < MAX_ITERATIONS; i++) {
          const modelStream = client.messages.stream({
            model: MODEL,
            max_tokens: 16000,
            thinking: { type: "adaptive", display: "summarized" },
            output_config: { effort: "high" },
            system: [
              {
                type: "text",
                text: systemPrompt(programs),
                cache_control: { type: "ephemeral" },
              },
            ],
            tools: [...AGENT_TOOLS, WEB_SEARCH_TOOL] as Anthropic.ToolUnion[],
            messages,
          });

          // Separate this iteration's prose from the previous one, so a preamble
          // written before a tool call doesn't run into the final answer.
          if (i > 0) send({ type: "text", delta: "\n\n" });

          modelStream.on("text", (delta) => send({ type: "text", delta }));
          modelStream.on("thinking", (delta) => send({ type: "thinking", delta }));

          // Server-side tools (web search) never produce a `tool_use` block for us to
          // execute, so surface them from the block stream or the UI looks frozen.
          modelStream.on("contentBlock", (block) => {
            if (block.type === "server_tool_use") {
              // Web search runs inside a code_execution wrapper. The wrapper's result
              // block is a different type we don't track, so its card would hang on
              // "running…" forever — and the web_search card already says what it means.
              if (block.name === "code_execution") return;
              send({ type: "tool_start", id: block.id, name: block.name, input: block.input });
            } else if (block.type === "web_search_tool_result") {
              const results = Array.isArray(block.content)
                ? block.content.map((r) => ({ title: r.title, url: r.url }))
                : block.content;
              send({
                type: "tool_end",
                id: block.tool_use_id,
                name: "web_search",
                output: JSON.stringify(results),
              });
            }
          });

          const response = await modelStream.finalMessage();

          if (response.stop_reason === "refusal") {
            send({ type: "error", message: "The model declined this request." });
            break;
          }

          // A server-side tool (web search) ran out of turn budget — resend to continue.
          if (response.stop_reason === "pause_turn") {
            messages.push({ role: "assistant", content: response.content });
            continue;
          }

          const toolUses = response.content.filter(
            (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
          );

          if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
            send({ type: "done", stop_reason: response.stop_reason });
            break;
          }

          messages.push({ role: "assistant", content: response.content });

          // Show the work: every tool call is surfaced in the UI as it happens.
          for (const tool of toolUses) {
            send({ type: "tool_start", id: tool.id, name: tool.name, input: tool.input });
          }

          const results = await Promise.all(
            toolUses.map(async (tool) => {
              const output = await executeTool(tool.name, tool.input, {
                seatsAeroKey: process.env.SEATS_AERO_API_KEY,
              });
              send({ type: "tool_end", id: tool.id, name: tool.name, output });
              return {
                type: "tool_result" as const,
                tool_use_id: tool.id,
                content: output,
              };
            })
          );

          messages.push({ role: "user", content: results });

          if (i === MAX_ITERATIONS - 1) {
            send({ type: "error", message: "Hit the iteration limit before finishing." });
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
