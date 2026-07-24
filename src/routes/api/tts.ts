import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const { text, voice } = (await request.json()) as { text?: string; voice?: string };
        if (!text || !text.trim()) return new Response("Missing text", { status: 400 });

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: text,
            voice: voice || "sage",
            instructions:
              "Fale em português do Brasil com uma voz calorosa, calma, ancestral e acolhedora — como um mentor espiritual brasileiro sentado à beira de uma fogueira. Ritmo tranquilo, pausas naturais, entonação suave, um leve sorriso na voz. Nunca robótico.",
            response_format: "mp3",
          }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          return new Response(`TTS failed: ${res.status} ${detail}`, { status: res.status });
        }
        return new Response(res.body, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
