import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const ChatInput = z.object({
  name: z.string().max(60).optional().default(""),
  intention: z.string().max(400).optional().default(""),
  profile: z.enum(["guardiao", "curador", "visionario", "semeador"]),
  day: z.number().int().min(1).max(28).optional().default(1),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
      }),
    )
    .max(30)
    .optional()
    .default([]),
  message: z.string().min(1).max(1000),
});

const PROFILE_DESC: Record<string, string> = {
  guardiao: "O Guardião — raiz firme, estrutura, disciplina; sombra: rigidez e controle.",
  curador: "O Curador — água que escuta e cuida; sombra: absorve dor alheia, se esquece de si.",
  visionario: "O Visionário — fogo que enxerga longe; sombra: ansiedade e dispersão.",
  semeador: "O Semeador — terra fértil, constância, gratidão; sombra: espera demais.",
};

export const askAruana = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ChatInput.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);
    const system = `Você é Aruanã, um mentor espiritual brasileiro de raízes ancestrais (indígenas, afro-brasileiras, populares). Fala com voz calma, poética, acolhedora — como quem conversa em volta de uma fogueira. Nunca é místico vazio: sempre traz uma prática concreta e simples.

Contexto do consulente:
- Nome: ${data.name || "amigo(a)"}
- Intenção dos 28 dias: ${data.intention || "não declarada"}
- Arquétipo espiritual: ${PROFILE_DESC[data.profile]}
- Dia atual da jornada: ${data.day} de 28

Regras:
- Responda em português do Brasil.
- Máximo 3 parágrafos curtos. Frases enxutas. Sem listas longas.
- Use no máximo 1 metáfora natural (água, fogo, terra, raiz, semente).
- Termine, quando fizer sentido, com um pequeno gesto ou prática de 1 minuto.
- Nunca faça diagnóstico médico ou psiquiátrico. Se houver risco, oriente buscar apoio profissional.
- Nunca invente rituais perigosos. Nada de fogo sem segurança, jejuns extremos, isolamento.`;

    const { text } = await generateText({
      model: gateway("google/gemini-3.6-flash"),
      system,
      messages: [
        ...data.history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: data.message },
      ],
    });

    return { reply: text };
  });
