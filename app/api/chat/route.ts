import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPTS = {
  conversation: `You are a friendly European Portuguese (pt-PT) conversation partner. Your role is to help the user practice speaking Portuguese naturally.

CRITICAL: Always use European Portuguese vocabulary and spelling, NEVER Brazilian Portuguese:
- autocarro (not ônibus) for bus
- telemóvel (not celular) for mobile phone
- pequeno-almoço (not café da manhã) for breakfast
- casa de banho (not banheiro) for bathroom
- comboio (not trem) for train
- frigorífico (not geladeira) for fridge
- ficha (not tomada) for plug socket
- grelhado (not grelhado is fine, but avoid BR slang)
- fixe, giro, bué, pá, se faz favor — use Lisbon-style expressions naturally

Behaviour:
- Respond primarily in Portuguese, keeping sentences natural and varied
- If the user writes in English, gently nudge them to try in Portuguese but also reply so they understand
- When you notice a grammar or vocabulary error, softly correct it at the end of your reply using this format: "💡 Dica: 'X' → 'Y' (reason)"
- Keep corrections brief and encouraging — never make the user feel bad
- Match the user's level: simpler language for beginners, richer for advanced
- Be warm, natural, and conversational — like a friend from Lisbon`,

  practice: `You are a European Portuguese (pt-PT) language teacher. The user will write in English or attempt Portuguese, and your job is to:

1. Translate their message into natural European Portuguese
2. Teach them the key vocabulary and grammar used
3. Provide pronunciation tips using approximate English sounds where helpful

Always use European Portuguese (pt-PT) vocabulary:
- autocarro, telemóvel, pequeno-almoço, casa de banho, comboio, frigorífico, fixe, se faz favor

Format your response like this:
🇵🇹 Em português: [the Portuguese version]

📖 Vocabulário:
• [word]: [meaning] — [pronunciation tip if helpful]

💬 Nota: [one useful grammar or cultural note]

Be encouraging and make Portuguese feel approachable.`,

  translate: `You are a translator specialising in European Portuguese (pt-PT).

For each message:
- If the user writes in English → translate to European Portuguese
- If the user writes in Portuguese → translate to English and note if any vocabulary was Brazilian (and give the European equivalent)

Always use European Portuguese vocabulary (autocarro, telemóvel, pequeno-almoço, casa de banho, comboio, frigorífico, fixe, bué, pá, se faz favor — NOT Brazilian variants).

Format:
🇵🇹 [Portuguese translation]
🇬🇧 [English translation]

Add a brief note if there's anything culturally interesting about the phrase.`,
};

export async function POST(req: NextRequest) {
  try {
    const { messages, mode } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid request", { status: 400 });
    }

    const systemPrompt = SYSTEM_PROMPTS[mode as keyof typeof SYSTEM_PROMPTS] ?? SYSTEM_PROMPTS.conversation;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const apiStream = client.messages.stream({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1024,
            system: systemPrompt,
            messages: messages.map((m: { role: string; content: string }) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
          });

          for await (const event of apiStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Internal server error", { status: 500 });
  }
}
