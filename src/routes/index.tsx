import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { askAruana } from "@/lib/aruana.functions";

export const Route = createFileRoute("/")({
  component: Aruana,
});

// ---------- Domain ----------

type ProfileKey = "guardiao" | "curador" | "visionario" | "semeador";

const PROFILES: Record<
  ProfileKey,
  { name: string; symbol: string; essence: string; strength: string; shadow: string; ritual: string }
> = {
  guardiao: {
    name: "O Guardião",
    symbol: "⛰",
    essence: "Raiz firme, presença que protege.",
    strength: "Estrutura, disciplina, palavra empenhada.",
    shadow: "Rigidez, controle, medo do movimento.",
    ritual: "Banho de sal grosso e alecrim ao amanhecer.",
  },
  curador: {
    name: "O Curador",
    symbol: "☾",
    essence: "Água que escuta e transforma dor em fluxo.",
    strength: "Empatia, intuição, cuidado com o outro.",
    shadow: "Absorve o que não é seu, esquece de si.",
    ritual: "Vela branca acesa por 7 minutos em silêncio.",
  },
  visionario: {
    name: "O Visionário",
    symbol: "☼",
    essence: "Fogo que enxerga longe e chama outros para andar.",
    strength: "Criatividade, coragem, direção.",
    shadow: "Ansiedade, dispersão, começos sem fim.",
    ritual: "Escrita livre de 3 minutos ao acordar.",
  },
  semeador: {
    name: "O Semeador",
    symbol: "✦",
    essence: "Terra fértil que planta o invisível no visível.",
    strength: "Constância, gratidão, colheita.",
    shadow: "Espera demais, cobra pouco de si.",
    ritual: "Plantar uma intenção por escrito antes de dormir.",
  },
};

type Question = {
  q: string;
  options: { label: string; profile: ProfileKey }[];
};

const QUESTIONS: Question[] = [
  {
    q: "Quando algo desmorona na sua vida, qual é seu primeiro movimento?",
    options: [
      { label: "Fecho as portas e reorganizo o que sobrou", profile: "guardiao" },
      { label: "Choro, escrevo, ligo pra quem me acolhe", profile: "curador" },
      { label: "Já imagino outro caminho e sigo", profile: "visionario" },
      { label: "Respiro, agradeço a lição e planto de novo", profile: "semeador" },
    ],
  },
  {
    q: "O que hoje mais te tira do eixo?",
    options: [
      { label: "Sentir que perdi o controle", profile: "guardiao" },
      { label: "Absorver a dor dos outros", profile: "curador" },
      { label: "Não ver resultado no que criei", profile: "visionario" },
      { label: "A pressa dos outros comigo", profile: "semeador" },
    ],
  },
  {
    q: "Qual elemento te chama mais?",
    options: [
      { label: "Terra — pés no chão, montanha", profile: "guardiao" },
      { label: "Água — rio, mar, lágrima", profile: "curador" },
      { label: "Fogo — sol, vela, brasa", profile: "visionario" },
      { label: "Ar — vento, sopro, semente que voa", profile: "semeador" },
    ],
  },
  {
    q: "O que te falta agora?",
    options: [
      { label: "Estrutura e rotina", profile: "guardiao" },
      { label: "Descanso e afeto", profile: "curador" },
      { label: "Direção clara", profile: "visionario" },
      { label: "Paciência com o tempo do céu", profile: "semeador" },
    ],
  },
  {
    q: "Quando alguém te olha nos olhos e pergunta 'como você está?', a verdade é:",
    options: [
      { label: "Estou firme, mas cansado de segurar tudo", profile: "guardiao" },
      { label: "Estou sensível, precisando de silêncio", profile: "curador" },
      { label: "Estou fervilhando de ideia e ansiedade", profile: "visionario" },
      { label: "Estou esperando algo que já plantei", profile: "semeador" },
    ],
  },
];

const PHASES = [
  { range: [1, 7], name: "Semana da Raiz", intent: "Firmar o chão. Voltar pra si." },
  { range: [8, 14], name: "Semana da Água", intent: "Limpar o que não é seu." },
  { range: [15, 21], name: "Semana do Fogo", intent: "Acender direção e coragem." },
  { range: [22, 28], name: "Semana da Colheita", intent: "Integrar. Agradecer. Recomeçar." },
];

const DAILY_PRACTICES = [
  "Banho consciente de 3 minutos: água caindo, respiração lenta, uma palavra.",
  "Escrita livre: 3 páginas sem pensar. Só sair.",
  "Silêncio de 10 minutos ao acordar. Sem tela.",
  "Chamar um ancestral pelo nome e agradecer.",
  "Beber um copo d'água em pé no sol.",
  "Escrever uma coisa que precisa terminar hoje.",
  "Acender uma vela e olhar por 2 minutos.",
];

// ---------- App ----------

type Stage = "welcome" | "onboarding" | "quiz" | "reveal" | "journey";

function Aruana() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [intention, setIntention] = useState("");
  const [answers, setAnswers] = useState<ProfileKey[]>([]);
  const [day, setDay] = useState(1);
  const [completed, setCompleted] = useState<Record<number, boolean>>({});

  const profile = useMemo<ProfileKey | null>(() => {
    if (answers.length < QUESTIONS.length) return null;
    const counts: Record<string, number> = {};
    answers.forEach((a) => (counts[a] = (counts[a] || 0) + 1));
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as ProfileKey;
  }, [answers]);

  // Save lead once when profile is revealed
  const savedRef = useRef(false);
  useEffect(() => {
    if (!profile || savedRef.current) return;
    if (!name || !whatsapp) return;
    savedRef.current = true;
    supabase
      .from("leads")
      .insert({ name, whatsapp, intention, profile })
      .then(({ error }) => {
        if (error) console.error("lead save error", error);
      });
  }, [profile, name, whatsapp, intention]);

  return (
    <main className="min-h-screen">
      <StarsBackdrop />
      <div className="relative mx-auto max-w-2xl px-5 py-10 sm:py-16">
        <Header />
        {stage === "welcome" && <Welcome onStart={() => setStage("onboarding")} />}
        {stage === "onboarding" && (
          <Onboarding
            name={name}
            setName={setName}
            whatsapp={whatsapp}
            setWhatsapp={setWhatsapp}
            intention={intention}
            setIntention={setIntention}
            onNext={() => setStage("quiz")}
          />
        )}
        {stage === "quiz" && (
          <Quiz
            onDone={(a) => {
              setAnswers(a);
              setStage("reveal");
            }}
          />
        )}
        {stage === "reveal" && profile && (
          <Reveal
            name={name}
            profile={profile}
            onContinue={() => setStage("journey")}
          />
        )}
        {stage === "journey" && profile && (
          <Journey
            name={name}
            intention={intention}
            profile={profile}
            day={day}
            setDay={setDay}
            completed={completed}
            setCompleted={setCompleted}
          />
        )}
        <Footer />
      </div>
    </main>
  );
}

// ---------- UI Bits ----------

function StarsBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-40">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1px 1px at 20% 30%, oklch(0.9 0.05 80) 50%, transparent 100%), radial-gradient(1px 1px at 70% 20%, oklch(0.9 0.05 80) 50%, transparent 100%), radial-gradient(1.5px 1.5px at 40% 70%, oklch(0.85 0.08 60) 50%, transparent 100%), radial-gradient(1px 1px at 85% 60%, oklch(0.9 0.05 80) 50%, transparent 100%), radial-gradient(1px 1px at 10% 85%, oklch(0.9 0.05 80) 50%, transparent 100%)",
          backgroundSize: "600px 600px",
        }}
      />
    </div>
  );
}

function Header() {
  return (
    <div className="mb-10 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-secondary/50 bg-primary/20 text-secondary">
          <span className="text-lg">✦</span>
        </div>
        <div>
          <div className="font-display text-xl leading-none text-foreground">Aruanã</div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            guia diário
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <p className="mt-16 text-center text-xs text-muted-foreground">
      Feito com raiz, água, fogo e semente. · Aruanã
    </p>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <section className="text-center">
      <p className="mb-4 text-xs uppercase tracking-[0.35em] text-secondary">
        Bem-vindo de volta a si
      </p>
      <h1 className="font-display text-5xl leading-[1.05] text-foreground sm:text-6xl">
        Sua rotina é <em className="text-secondary">altar</em>.<br />
        Sua vida é <em className="text-primary">ritual</em>.
      </h1>
      <p className="mx-auto mt-6 max-w-md text-base text-muted-foreground">
        Um guia diário que une organização da vida pessoal, autoconhecimento e
        ancestralidade — em uma jornada prática de 28 dias.
      </p>
      <button
        onClick={onStart}
        className="mt-10 inline-flex h-14 items-center justify-center rounded-full px-8 text-base font-medium text-primary-foreground shadow-[var(--shadow-sagrado)] transition hover:brightness-110"
        style={{ background: "var(--gradient-brasa)" }}
      >
        Começar minha jornada
      </button>
      <div className="mt-14 grid grid-cols-2 gap-4 text-left sm:grid-cols-4">
        {Object.values(PROFILES).map((p) => (
          <div
            key={p.name}
            className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-sm"
          >
            <div className="text-2xl text-secondary">{p.symbol}</div>
            <div className="mt-2 font-display text-lg">{p.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">{p.essence}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Onboarding({
  name,
  setName,
  whatsapp,
  setWhatsapp,
  intention,
  setIntention,
  onNext,
}: {
  name: string;
  setName: (s: string) => void;
  whatsapp: string;
  setWhatsapp: (s: string) => void;
  intention: string;
  setIntention: (s: string) => void;
  onNext: () => void;
}) {
  const digits = whatsapp.replace(/\D/g, "");
  const canNext =
    name.trim().length >= 2 && digits.length >= 10 && intention.trim().length >= 3;
  return (
    <section>
      <StepHeader step={1} total={3} title="Antes de tudo, respira." />
      <p className="mt-3 text-muted-foreground">
        Vou te chamar pelo nome. E vou te lembrar do porquê você chegou aqui.
      </p>
      <div className="mt-8 space-y-6">
        <Field label="Como quer ser chamado?">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 40))}
            placeholder="Seu primeiro nome"
            className="w-full rounded-xl border border-border bg-input/60 px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40"
          />
        </Field>
        <Field label="WhatsApp (para lembretes da jornada)">
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value.slice(0, 20))}
            inputMode="tel"
            placeholder="(11) 91234-5678"
            className="w-full rounded-xl border border-border bg-input/60 px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40"
          />
          <div className="mt-1 text-xs text-muted-foreground">
            Guardamos com carinho. Só usamos para te chamar de volta à prática.
          </div>
        </Field>
        <Field label="Qual é a intenção que você traz para esses 28 dias?">
          <textarea
            value={intention}
            onChange={(e) => setIntention(e.target.value.slice(0, 220))}
            rows={3}
            placeholder="Ex: reencontrar meu eixo, cuidar do meu sono, terminar o que comecei..."
            className="w-full resize-none rounded-xl border border-border bg-input/60 px-4 py-3 text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40"
          />
          <div className="mt-1 text-right text-xs text-muted-foreground">
            {intention.length}/220
          </div>
        </Field>
      </div>
      <PrimaryButton disabled={!canNext} onClick={onNext}>
        Continuar
      </PrimaryButton>
    </section>
  );
}

function Quiz({ onDone }: { onDone: (a: ProfileKey[]) => void }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<ProfileKey[]>([]);
  const q = QUESTIONS[i];

  function choose(p: ProfileKey) {
    const next = [...answers, p];
    setAnswers(next);
    if (i + 1 < QUESTIONS.length) setI(i + 1);
    else onDone(next);
  }

  return (
    <section>
      <StepHeader
        step={2}
        total={3}
        title={`Diagnóstico espiritual — ${i + 1} de ${QUESTIONS.length}`}
      />
      <Progress value={((i + 1) / QUESTIONS.length) * 100} />
      <h2 className="mt-8 font-display text-3xl leading-tight text-foreground">
        {q.q}
      </h2>
      <div className="mt-6 space-y-3">
        {q.options.map((opt) => (
          <button
            key={opt.label}
            onClick={() => choose(opt.profile)}
            className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card/60 px-5 py-4 text-left transition hover:border-primary hover:bg-card"
          >
            <span className="text-secondary transition group-hover:text-primary">
              {PROFILES[opt.profile].symbol}
            </span>
            <span className="text-foreground">{opt.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Reveal({
  name,
  profile,
  onContinue,
}: {
  name: string;
  profile: ProfileKey;
  onContinue: () => void;
}) {
  const p = PROFILES[profile];
  return (
    <section className="text-center">
      <p className="text-xs uppercase tracking-[0.35em] text-secondary">
        Seu arquétipo espiritual
      </p>
      <div
        className="mx-auto mt-6 flex h-28 w-28 items-center justify-center rounded-full border border-secondary/40 text-5xl text-secondary shadow-[var(--shadow-sagrado)]"
        style={{ background: "var(--gradient-noite)" }}
      >
        {p.symbol}
      </div>
      <h1 className="mt-6 font-display text-5xl text-foreground">{p.name}</h1>
      <p className="mx-auto mt-3 max-w-md text-muted-foreground">
        {name ? `${name}, ` : ""}sua essência é: {p.essence.toLowerCase()}
      </p>
      <div className="mt-8 space-y-3 text-left">
        <RevealCard label="Sua força" text={p.strength} />
        <RevealCard label="Sua sombra" text={p.shadow} />
        <RevealCard label="Ritual guia" text={p.ritual} />
      </div>
      <PrimaryButton onClick={onContinue}>Entrar na jornada de 28 dias</PrimaryButton>
    </section>
  );
}

function RevealCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <div className="text-[11px] uppercase tracking-[0.2em] text-secondary">
        {label}
      </div>
      <div className="mt-1 text-foreground">{text}</div>
    </div>
  );
}

function Journey({
  name,
  intention,
  profile,
  day,
  setDay,
  completed,
  setCompleted,
}: {
  name: string;
  intention: string;
  profile: ProfileKey;
  day: number;
  setDay: (n: number) => void;
  completed: Record<number, boolean>;
  setCompleted: (c: Record<number, boolean>) => void;
}) {
  const p = PROFILES[profile];
  const phase = PHASES.find((ph) => day >= ph.range[0] && day <= ph.range[1])!;
  const practice = DAILY_PRACTICES[(day - 1) % DAILY_PRACTICES.length];
  const done = !!completed[day];
  const doneCount = Object.values(completed).filter(Boolean).length;
  const [mentorOpen, setMentorOpen] = useState(false);

  return (
    <section>
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-secondary">
        <span>{p.symbol}</span>
        <span>{p.name.replace("O ", "")}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{phase.name}</span>
      </div>
      <h1 className="font-display text-4xl text-foreground">
        {name ? `Olá, ${name}.` : "Olá."}
      </h1>
      {intention && (
        <p className="mt-2 text-sm italic text-muted-foreground">
          Intenção: “{intention}”
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-card/70 p-6 shadow-[var(--shadow-sagrado)]">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-secondary">
              Dia {day} de 28
            </div>
            <div className="mt-1 font-display text-2xl text-foreground">
              {phase.intent}
            </div>
          </div>
        </div>
        <Progress value={(day / 28) * 100} />

        <div className="mt-6 rounded-xl border border-border bg-background/40 p-4">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Prática de hoje
          </div>
          <p className="mt-2 font-display text-xl leading-snug text-foreground">
            {practice}
          </p>
        </div>

        <button
          onClick={() => setCompleted({ ...completed, [day]: !done })}
          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition ${
            done
              ? "bg-secondary text-secondary-foreground"
              : "text-primary-foreground hover:brightness-110"
          }`}
          style={done ? undefined : { background: "var(--gradient-brasa)" }}
        >
          {done ? "✓ Prática registrada" : "Marcar prática do dia"}
        </button>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            onClick={() => setDay(Math.max(1, day - 1))}
            disabled={day <= 1}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            ← Dia anterior
          </button>
          <span className="text-xs text-muted-foreground">
            {doneCount} de 28 concluídos
          </span>
          <button
            onClick={() => setDay(Math.min(28, day + 1))}
            disabled={day >= 28}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            Próximo dia →
          </button>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Sua jornada
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 28 }, (_, k) => k + 1).map((d) => {
            const isDone = !!completed[d];
            const isToday = d === day;
            return (
              <button
                key={d}
                onClick={() => setDay(d)}
                className={`aspect-square rounded-lg border text-xs transition ${
                  isToday
                    ? "border-primary bg-primary text-primary-foreground"
                    : isDone
                    ? "border-secondary/60 bg-secondary/20 text-secondary"
                    : "border-border bg-card/40 text-muted-foreground hover:border-primary/60"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-secondary/30 bg-card/60 p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-secondary">
          <span>✦</span> Aruanã · mentor por voz
        </div>
        <p className="mt-3 text-foreground">
          Toque no botão e converse com Aruanã. Ele conhece seu arquétipo{" "}
          <em className="text-secondary">{p.name}</em> e sua intenção.
        </p>
        <button
          onClick={() => setMentorOpen(true)}
          className="mt-4 rounded-full border border-secondary/50 px-5 py-2 text-sm text-secondary transition hover:bg-secondary/10"
        >
          🎙️ Falar com Aruanã
        </button>
      </div>

      {mentorOpen && (
        <VoiceMentor
          name={name}
          intention={intention}
          profile={profile}
          day={day}
          onClose={() => setMentorOpen(false)}
        />
      )}
    </section>
  );
}

// ---------- Voice Mentor ----------

type ChatMsg = { role: "user" | "assistant"; content: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any;

function VoiceMentor({
  name,
  intention,
  profile,
  day,
  onClose,
}: {
  name: string;
  intention: string;
  profile: ProfileKey;
  day: number;
  onClose: () => void;
}) {
  const ask = useServerFn(askAruana);
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [status, setStatus] = useState<"idle" | "listening" | "thinking" | "speaking">(
    "idle",
  );
  const [transcript, setTranscript] = useState("");
  const [text, setText] = useState("");
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<AnySpeechRecognition | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => AnySpeechRecognition;
      webkitSpeechRecognition?: new () => AnySpeechRecognition;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      let t = "";
      for (let i = 0; i < event.results.length; i++) {
        t += event.results[i][0].transcript;
      }
      setTranscript(t);
    };
    rec.onend = () => {
      setStatus((s) => (s === "listening" ? "idle" : s));
    };
    recognitionRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch {
        /* noop */
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, status]);

  function speak(t: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "pt-BR";
    u.rate = 0.98;
    u.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const pt = voices.find((v) => v.lang?.toLowerCase().startsWith("pt"));
    if (pt) u.voice = pt;
    u.onend = () => setStatus((s) => (s === "speaking" ? "idle" : s));
    setStatus("speaking");
    window.speechSynthesis.speak(u);
  }

  async function send(message: string) {
    const msg = message.trim();
    if (!msg) return;
    setTranscript("");
    setText("");
    const next: ChatMsg[] = [...history, { role: "user", content: msg }];
    setHistory(next);
    setStatus("thinking");
    try {
      const res = await ask({
        data: {
          name,
          intention,
          profile,
          day,
          history: next.slice(-10),
          message: msg,
        },
      });
      const reply = res.reply || "…";
      setHistory([...next, { role: "assistant", content: reply }]);
      speak(reply);
    } catch (e) {
      console.error(e);
      setHistory([
        ...next,
        {
          role: "assistant",
          content: "Perdi o sinal do rio agora. Respira e me chama de novo daqui a pouco.",
        },
      ]);
      setStatus("idle");
    }
  }

  function toggleListen() {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (status === "listening") {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
      const t = transcript.trim();
      if (t) send(t);
      return;
    }
    window.speechSynthesis?.cancel();
    setTranscript("");
    setStatus("listening");
    try {
      rec.start();
    } catch {
      setStatus("idle");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm sm:items-center">
      <div className="relative flex h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-secondary/30 bg-card shadow-[var(--shadow-sagrado)] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-secondary"
              style={{ background: "var(--gradient-noite)" }}
            >
              ✦
            </div>
            <div>
              <div className="font-display text-lg leading-none">Aruanã</div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {status === "listening"
                  ? "ouvindo..."
                  : status === "thinking"
                    ? "sentindo..."
                    : status === "speaking"
                      ? "falando..."
                      : "em silêncio"}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              window.speechSynthesis?.cancel();
              onClose();
            }}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
          {history.length === 0 && (
            <div className="rounded-2xl border border-secondary/20 bg-background/40 p-4 text-sm text-muted-foreground">
              Fala comigo, {name || "amigo"}. Pode ser um desabafo, uma dúvida sobre a
              prática de hoje, ou só um "estou cansado". Aruanã escuta.
            </div>
          )}
          {history.map((m, i) => (
            <div
              key={i}
              className={`rounded-2xl px-4 py-3 text-sm ${
                m.role === "user"
                  ? "ml-8 bg-primary/20 text-foreground"
                  : "mr-8 border border-secondary/30 bg-background/40 text-foreground"
              }`}
            >
              {m.role === "assistant" && (
                <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-secondary">
                  Aruanã
                </div>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
            </div>
          ))}
          {transcript && status === "listening" && (
            <div className="ml-8 rounded-2xl bg-primary/10 px-4 py-3 text-sm italic text-muted-foreground">
              {transcript}
            </div>
          )}
          {status === "thinking" && (
            <div className="mr-8 rounded-2xl border border-secondary/30 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary [animation-delay:300ms]" />
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-border/60 bg-background/60 px-5 py-4">
          {!supported ? (
            <p className="text-xs text-muted-foreground">
              Voz não é suportada neste navegador. Use o campo abaixo para escrever.
            </p>
          ) : (
            <div className="mb-3 flex items-center justify-center">
              <button
                onClick={toggleListen}
                disabled={status === "thinking" || status === "speaking"}
                className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl transition disabled:opacity-40 ${
                  status === "listening"
                    ? "bg-secondary text-secondary-foreground shadow-[0_0_0_8px_oklch(0.85_0.08_60_/_0.15)]"
                    : "text-primary-foreground"
                }`}
                style={
                  status === "listening"
                    ? undefined
                    : { background: "var(--gradient-brasa)" }
                }
                aria-label={status === "listening" ? "Parar" : "Falar"}
              >
                {status === "listening" ? "■" : "🎙️"}
              </button>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (status === "thinking") return;
              send(text);
            }}
            className="flex items-center gap-2"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ou escreva para Aruanã..."
              className="flex-1 rounded-full border border-border bg-input/60 px-4 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            />
            <button
              type="submit"
              disabled={!text.trim() || status === "thinking"}
              className="rounded-full px-4 py-2 text-sm text-primary-foreground disabled:opacity-40"
              style={{ background: "var(--gradient-brasa)" }}
            >
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ---------- Primitives ----------

function StepHeader({ step, total, title }: { step: number; total: number; title: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.3em] text-secondary">
        Passo {step} de {total}
      </div>
      <h1 className="mt-3 font-display text-4xl text-foreground sm:text-5xl">
        {title}
      </h1>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${value}%`, background: "var(--gradient-brasa)" }}
      />
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="mt-10 inline-flex h-13 w-full items-center justify-center rounded-full px-8 py-4 text-base font-medium text-primary-foreground shadow-[var(--shadow-sagrado)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      style={{ background: "var(--gradient-brasa)" }}
    >
      {children}
    </button>
  );
}
