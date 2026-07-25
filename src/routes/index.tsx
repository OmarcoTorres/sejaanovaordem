import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { askAruana } from "@/lib/aruana.functions";
import pix999 from "@/assets/pix-999.jpeg.asset.json";
import pix28 from "@/assets/pix-28.jpeg.asset.json";
import pix197 from "@/assets/pix-197.jpeg.asset.json";

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

const STAGE_ORDER: Stage[] = ["welcome", "onboarding", "quiz", "reveal", "journey"];

function Aruana() {
  const [stage, setStage] = useState<Stage>("welcome");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [intention, setIntention] = useState("");
  const [answers, setAnswers] = useState<ProfileKey[]>([]);
  const [day, setDay] = useState(1);
  const [completed, setCompleted] = useState<Record<number, boolean>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [paid, setPaid] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const profile = useMemo<ProfileKey | null>(() => {
    if (answers.length < QUESTIONS.length) return null;
    const counts: Record<string, number> = {};
    answers.forEach((a) => (counts[a] = (counts[a] || 0) + 1));
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as ProfileKey;
  }, [answers]);

  function goBack() {
    const idx = STAGE_ORDER.indexOf(stage);
    if (idx > 0) setStage(STAGE_ORDER[idx - 1]);
  }

  // 1) Ensure a persistent (anonymous) session and load saved progress.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error("anon sign-in error", error);
          if (!cancelled) setLoaded(true);
          return;
        }
        ({ data: sessionData } = await supabase.auth.getSession());
      }
      const uid = sessionData.session?.user.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (!uid) {
        setLoaded(true);
        return;
      }
      const { data: prog } = await supabase
        .from("journey_progress")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      if (cancelled) return;
      if (prog) {
        setName(prog.name ?? "");
        setWhatsapp(prog.whatsapp ?? "");
        setIntention(prog.intention ?? "");
        setAnswers(Array.isArray(prog.answers) ? (prog.answers as ProfileKey[]) : []);
        setDay(prog.day ?? 1);
        setCompleted(
          prog.completed && typeof prog.completed === "object"
            ? (prog.completed as Record<number, boolean>)
            : {},
        );
        setPaid(!!(prog as { paid?: boolean }).paid);
        const savedStage = (prog.stage as Stage) ?? "welcome";
        if (prog.profile && (savedStage === "welcome" || savedStage === "onboarding" || savedStage === "quiz")) {
          setStage("journey");
        } else {
          setStage(savedStage);
        }
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Persist progress whenever meaningful state changes.
  const skipFirstSave = useRef(true);
  useEffect(() => {
    if (!loaded || !userId) return;
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    const payload = {
      user_id: userId,
      name: name || null,
      whatsapp: whatsapp || null,
      intention: intention || null,
      profile: profile ?? null,
      stage,
      day,
      answers: answers as unknown as import("@/integrations/supabase/types").Json,
      completed: completed as unknown as import("@/integrations/supabase/types").Json,
      paid,
    };
    const t = setTimeout(() => {
      supabase
        .from("journey_progress")
        .upsert(payload, { onConflict: "user_id" })
        .then(({ error }) => {
          if (error) console.error("progress save error", error);
        });
    }, 400);
    return () => clearTimeout(t);
  }, [loaded, userId, name, whatsapp, intention, profile, stage, day, answers, completed, paid]);

  // 5s após entrar na jornada sem pagamento, abrir o portão do Desafio (definitivo).
  useEffect(() => {
    if (stage !== "journey" || paid) return;
    const t = setTimeout(() => setPaywallOpen(true), 5000);
    return () => clearTimeout(t);
  }, [stage, paid]);

  // Enquanto o portão está aberto, consultar liberação manual do banco a cada 8s.
  useEffect(() => {
    if (!paywallOpen || paid || !userId) return;
    let stopped = false;
    const tick = async () => {
      const { data } = await supabase
        .from("journey_progress")
        .select("paid")
        .eq("user_id", userId)
        .maybeSingle();
      if (stopped) return;
      if (data?.paid) {
        setPaid(true);
        setPaywallOpen(false);
      }
    };
    const id = setInterval(tick, 8000);
    tick();
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [paywallOpen, paid, userId]);

  // 3) Save lead once when profile is revealed.
  const leadSavedRef = useRef(false);
  useEffect(() => {
    if (!profile || leadSavedRef.current) return;
    if (!name || !whatsapp) return;
    leadSavedRef.current = true;
    supabase
      .from("leads")
      .insert({ name, whatsapp, intention, profile, user_id: userId })
      .then(({ error }) => {
        if (error) console.error("lead save error", error);
      });
  }, [profile, name, whatsapp, intention, userId]);

  if (!loaded) {
    return (
      <main className="min-h-screen">
        <StarsBackdrop />
        <div className="relative mx-auto flex max-w-2xl items-center justify-center px-5 py-20 text-muted-foreground">
          <span className="text-sm tracking-[0.2em] uppercase">acendendo a vela…</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <StarsBackdrop />
      <div className="relative mx-auto max-w-2xl px-5 py-10 sm:py-16">
        <Header canGoBack={STAGE_ORDER.indexOf(stage) > 0} onBack={goBack} />
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
            paid={paid}
            onRequestUnlock={() => setPaywallOpen(true)}
          />
        )}
        <Footer />
      </div>
      <PaywallGate
        open={paywallOpen && stage === "journey" && !paid}
        name={name}
        onConfirmPaid={() => {
          setPaid(true);
          setPaywallOpen(false);
        }}
      />
    </main>
  );
}


// ---------- UI Bits ----------

function StarsBackdrop() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let tx = 0, ty = 0;
    const onMove = (x: number, y: number) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      tx = (x / w - 0.5) * 24;
      ty = (y / h - 0.5) * 24;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          el.style.setProperty("--px", `${tx}px`);
          el.style.setProperty("--py", `${ty}px`);
          raf = 0;
        });
      }
    };
    const mouse = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const touch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) onMove(t.clientX, t.clientY);
    };
    window.addEventListener("mousemove", mouse, { passive: true });
    window.addEventListener("touchmove", touch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", mouse);
      window.removeEventListener("touchmove", touch);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Deterministic seeds so SSR + client render identically
  const leaves = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const seed = (i * 97) % 100;
        return {
          left: (seed * 1.03) % 100,
          size: 10 + ((seed * 3) % 18),
          duration: 22 + ((seed * 7) % 28),
          delay: -((seed * 1.7) % 30),
          drift: -60 + ((seed * 11) % 120),
          hue: 110 + ((seed * 5) % 60),
          rot: (seed * 13) % 360,
        };
      }),
    [],
  );

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ transform: "translate3d(var(--px,0), var(--py,0), 0)", transition: "transform 400ms ease-out" }}
    >
      {/* Canopy orbs — sunlight through leaves */}
      <div
        className="absolute -top-20 -left-16 h-[55vh] w-[55vh] rounded-full blur-3xl opacity-40"
        style={{
          background: "radial-gradient(circle, oklch(0.7 0.16 130 / 0.7), transparent 65%)",
          animation: "canopy-sway 14s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -bottom-24 -right-16 h-[60vh] w-[60vh] rounded-full blur-3xl opacity-35"
        style={{
          background: "radial-gradient(circle, oklch(0.55 0.14 160 / 0.7), transparent 65%)",
          animation: "canopy-sway 18s ease-in-out infinite reverse",
        }}
      />
      <div
        className="absolute top-1/3 left-1/2 h-[35vh] w-[35vh] -translate-x-1/2 rounded-full blur-3xl opacity-25"
        style={{
          background: "radial-gradient(circle, oklch(0.82 0.15 105 / 0.6), transparent 70%)",
          animation: "canopy-sway 22s ease-in-out infinite",
        }}
      />

      {/* Floating leaves / spores */}
      {leaves.map((l, i) => (
        <span
          key={i}
          className="absolute block"
          style={{
            left: `${l.left}%`,
            top: 0,
            width: `${l.size}px`,
            height: `${l.size}px`,
            borderRadius: "60% 20% 60% 20%",
            background: `radial-gradient(circle at 30% 30%, oklch(0.85 0.12 ${l.hue}), oklch(0.45 0.14 ${l.hue}))`,
            filter: "blur(0.3px)",
            opacity: 0.7,
            transform: `rotate(${l.rot}deg)`,
            // @ts-expect-error css var
            "--drift-x": `${l.drift}px`,
            animation: `leaf-drift ${l.duration}s linear ${l.delay}s infinite`,
          }}
        />
      ))}

      {/* Vignette to keep contrast on mobile */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, oklch(0.1 0.02 155 / 0.55) 100%)",
        }}
      />
    </div>
  );
}

function Header({ canGoBack, onBack }: { canGoBack: boolean; onBack: () => void }) {
  return (
    <div className="mb-10 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {canGoBack ? (
          <button
            onClick={onBack}
            aria-label="Voltar"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/50 text-secondary backdrop-blur-sm transition hover:border-secondary/60 hover:bg-card"
          >
            <span className="text-lg leading-none">←</span>
          </button>
        ) : (
          <div className="h-10 w-10" aria-hidden />
        )}
        <div className="flex items-center gap-3 pl-1">
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
      <Checkouts />
    </section>
  );
}

type Product = {
  badge: string;
  price: string;
  priceNumber: string;
  title: string;
  tagline: string;
  items: string[];
  qr?: string;
  highlight?: boolean;
};

const PRODUCTS: Product[] = [
  {
    badge: "Consulta 1:1",
    price: "R$ 9,99",
    priceNumber: "9,99",
    title: "Consulta & Direcionamento Espiritual",
    tagline: "30 minutos por chamada para atravessar sua semana com clareza.",
    items: [
      "Sessão de 30 min por chamada de voz",
      "Desenvolvimento mediúnico guiado",
      "Orientação e alinhamento com os Orixás",
      "Direcionamento prático para a semana",
    ],
    qr: pix999.url,
  },
  {
    badge: "Foco Principal · Desafio",
    price: "R$ 28,00",
    priceNumber: "28,00",
    title: "Desafio 28 Dias",
    tagline: "A jornada ancestral completa — do primeiro banho ao DMT natural.",
    items: [
      "Banhos, defumações e orações guiadas",
      "Meditações, trabalhos de limpeza e canalizações",
      "Ativação do DMT natural pela prática ancestral",
      "Práticas diárias no app + grupo fechado dos 28 dias",
    ],
    qr: pix28.url,
    highlight: true,
  },
  {
    badge: "Add-on · Clube",
    price: "+ R$ 19,99",
    priceNumber: "19,99",
    title: "Clube do Livro VIP",
    tagline: "Círculo VIP de estudo mensal para quem já entrou no Desafio.",
    items: [
      "Acesso ao grupo VIP Clube do Livro",
      "Encontro mensal com leituras ancestrais",
      "Materiais de estudo aprofundado",
      "Adicional ao Desafio 28 dias",
    ],
  },
  {
    badge: "Mentoria Alquimista",
    price: "R$ 197",
    priceNumber: "197,00",
    title: "Consultoria & Acompanhamento Semanal",
    tagline: "Até 3 alinhamentos por semana — projetos, tecnologia e Hermetismo aplicado.",
    items: [
      "Até 3 alinhamentos por semana com o Guia",
      "Desenvolvimento de projetos e tecnologia",
      "Estudos aprofundados e leituras dirigidas",
      "Aplicação viva das 7 Leis Herméticas",
    ],
    qr: pix197.url,
  },
];

function Checkouts() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);

  function openPay(p: Product) {
    setSelected(p);
    setOpen(true);
  }

  return (
    <section className="mt-20">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-secondary">
          Caminhe mais fundo na mata
        </p>
        <h2 className="mt-3 font-display text-3xl text-foreground sm:text-4xl">
          Quatro passagens. Um mesmo rio.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Cada oferta abre um Pix com QR Code em nome de Cauan Pataxó — direto,
          sem intermediários. Escolha por onde entrar.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
        {PRODUCTS.map((p) => (
          <ProductCard key={p.title} product={p} onPay={() => openPay(p)} />
        ))}
      </div>

      <p className="mx-auto mt-6 max-w-md text-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
        Pagamentos processados via banco Inter · Titular Cauan Pataxó
      </p>

      <PixDialog
        open={open}
        onOpenChange={setOpen}
        product={selected}
      />
    </section>
  );
}

function ProductCard({ product, onPay }: { product: Product; onPay: () => void }) {
  const { badge, price, title, tagline, items, highlight } = product;
  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-3xl border p-6 backdrop-blur-sm transition hover:-translate-y-0.5 ${
        highlight
          ? "border-secondary/70 bg-card shadow-[var(--shadow-sagrado)] md:col-span-2"
          : "border-border/70 bg-card/60 shadow-[0_10px_30px_-15px_oklch(0.1_0.02_155/0.6)]"
      }`}
      style={
        highlight
          ? {
              backgroundImage:
                "radial-gradient(ellipse at top right, oklch(0.55 0.14 155 / 0.28), transparent 60%), radial-gradient(ellipse at bottom left, oklch(0.82 0.14 105 / 0.18), transparent 55%)",
            }
          : undefined
      }
    >
      {highlight && (
        <div className="absolute right-4 top-4 rounded-full border border-secondary/60 bg-secondary/20 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-secondary">
          ★ Escolha do Guia
        </div>
      )}
      <div className="flex items-baseline gap-2">
        <span className="text-lg text-secondary">✦</span>
        <span className="text-[11px] uppercase tracking-[0.25em] text-secondary">
          {badge}
        </span>
      </div>
      <div className="mt-3 flex items-end gap-3">
        <div className="font-display text-4xl leading-none text-foreground sm:text-5xl">
          {price}
        </div>
      </div>
      <div className="mt-2 font-display text-xl text-foreground/95 sm:text-2xl">
        {title}
      </div>
      <p className="mt-2 text-sm italic text-muted-foreground">{tagline}</p>

      <div className="mt-4 h-px w-12 bg-secondary/40" />

      <ul className="mt-4 flex-1 space-y-2 text-sm text-foreground/85">
        {items.map((it) => (
          <li key={it} className="flex gap-2.5">
            <span className="mt-0.5 text-secondary">✦</span>
            <span className="leading-snug">{it}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onPay}
        className="mt-6 w-full rounded-full px-5 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-sagrado)] transition hover:brightness-110"
        style={{ background: "var(--gradient-brasa)" }}
      >
        Pagar com Pix — {price}
      </button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        QR Code e chave copia-e-cola aparecem em seguida
      </p>
    </article>
  );
}

const PIX_KEY = "39431215-005e-4a2f-a647-cf07e615cccc";

function PixDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: Product | null;
}) {
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setZoom(false);
    }
  }, [open]);

  function copy() {
    navigator.clipboard?.writeText(PIX_KEY).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => {},
    );
  }

  if (!product) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-secondary/40 bg-card p-6 shadow-[var(--shadow-sagrado)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Fechar"
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-border/60 text-secondary transition hover:bg-secondary/10"
            >
              ×
            </button>
            <div className="text-[11px] uppercase tracking-[0.25em] text-secondary">
              {product.badge}
            </div>
            <h3 className="mt-1 font-display text-2xl text-foreground">
              {product.title}
            </h3>
            <div className="mt-1 font-display text-3xl text-foreground">
              {product.price}
            </div>

            <div className="mt-5 rounded-2xl border border-border/60 bg-background/60 p-4">
              {product.qr ? (
                <>
                  <button
                    type="button"
                    onClick={() => setZoom(true)}
                    className="group relative mx-auto block"
                    aria-label="Ampliar QR Code"
                  >
                    <img
                      src={product.qr}
                      alt={`QR Code Pix ${product.price}`}
                      className="mx-auto h-56 w-56 rounded-lg object-contain transition group-hover:opacity-90"
                    />
                    <span className="mt-2 block text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Toque para ampliar
                    </span>
                  </button>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-secondary/40 bg-background/50 p-4 text-center text-sm text-muted-foreground">
                  Este valor não tem QR pré-gerado. Use a chave Pix abaixo e
                  digite <strong className="text-foreground">{product.price}</strong>{" "}
                  no app do seu banco.
                </div>
              )}

              <div className="mt-4 text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Chave Pix (copia e cola)
              </div>
              <button
                onClick={copy}
                className="mt-2 w-full truncate rounded-full border border-secondary/40 px-3 py-2 text-xs text-secondary transition hover:bg-secondary/10"
              >
                {copied ? "✓ Copiado" : PIX_KEY}
              </button>
              <div className="mt-3 text-center text-[11px] text-muted-foreground">
                Titular: CAUAN DE JESUS DE QUEIROZ SANTOS · Inter
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Após pagar, envie o comprovante pelo WhatsApp cadastrado para
              liberar seu acesso.
            </p>
          </div>

          {zoom && product.qr && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
              onClick={() => setZoom(false)}
            >
              <img
                src={product.qr}
                alt={`QR Code Pix ${product.price} ampliado`}
                className="max-h-[90vh] max-w-[90vw] rounded-xl bg-white p-3 object-contain"
              />
            </div>
          )}
        </div>
      )}
    </>
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
  paid,
  onRequestUnlock,
}: {
  name: string;
  intention: string;
  profile: ProfileKey;
  day: number;
  setDay: (n: number) => void;
  completed: Record<number, boolean>;
  setCompleted: (c: Record<number, boolean>) => void;
  paid: boolean;
  onRequestUnlock: () => void;
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
          onClick={() => {
            if (!paid) {
              onRequestUnlock();
              return;
            }
            setCompleted({ ...completed, [day]: !done });
          }}
          className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition ${
            done
              ? "bg-secondary text-secondary-foreground"
              : "text-primary-foreground hover:brightness-110"
          }`}
          style={done ? undefined : { background: "var(--gradient-brasa)" }}
        >
          {!paid ? "🔒 Liberar acesso ao Desafio" : done ? "✓ Prática registrada" : "Marcar prática do dia"}
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
          onClick={() => (paid ? setMentorOpen(true) : onRequestUnlock())}
          className="mt-4 rounded-full border border-secondary/50 px-5 py-2 text-sm text-secondary transition hover:bg-secondary/10"
        >
          {paid ? "🎙️ Falar com Aruanã" : "🔒 Liberar mentor Aruanã"}
        </button>
      </div>

      {mentorOpen && paid && (
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
  const [status, setStatus] = useState<
    "idle" | "listening" | "transcribing" | "thinking" | "speaking"
  >("idle");
  const [text, setText] = useState("");
  const [supported, setSupported] = useState(true);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setSupported(false);
    }
    return () => {
      try {
        recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      } catch {
        /* noop */
      }
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, status]);

  async function playTTS(t: string) {
    try {
      setStatus("speaking");
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      if (!res.ok) throw new Error(`TTS ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current?.pause();
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setStatus((s) => (s === "speaking" ? "idle" : s));
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setStatus("idle");
      };
      await audio.play();
    } catch (e) {
      console.error("tts", e);
      setStatus("idle");
    }
  }

  async function send(message: string) {
    const msg = message.trim();
    if (!msg) return;
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
      await playTTS(reply);
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

  async function startRecording() {
    if (!supported) return;
    try {
      audioRef.current?.pause();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const rec = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 1200) {
          setStatus("idle");
          return;
        }
        setStatus("transcribing");
        try {
          const fd = new FormData();
          const ext = (rec.mimeType || "audio/webm").includes("mp4") ? "mp4" : "webm";
          fd.append("file", blob, `recording.${ext}`);
          const r = await fetch("/api/stt", { method: "POST", body: fd });
          if (!r.ok) throw new Error(`STT ${r.status}`);
          const { text: transcript } = (await r.json()) as { text: string };
          const clean = (transcript || "").trim();
          if (!clean) {
            setStatus("idle");
            return;
          }
          await send(clean);
        } catch (e) {
          console.error("stt", e);
          setStatus("idle");
        }
      };
      recorderRef.current = rec;
      rec.start();
      setStatus("listening");
    } catch (e) {
      console.error("mic", e);
      setSupported(false);
      setStatus("idle");
    }
  }

  function stopRecording() {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    }
  }

  function toggleListen() {
    if (status === "listening") stopRecording();
    else if (status === "idle") startRecording();
  }

  const statusLabel =
    status === "listening"
      ? "ouvindo..."
      : status === "transcribing"
        ? "entendendo..."
        : status === "thinking"
          ? "sentindo..."
          : status === "speaking"
            ? "falando..."
            : "em silêncio";

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
                {statusLabel}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              audioRef.current?.pause();
              stopRecording();
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
              Toca o microfone e fala comigo, {name || "amigo"}. Eu escuto, entendo
              o que você disse e respondo em voz — como numa conversa de verdade.
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
          {(status === "thinking" || status === "transcribing") && (
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
            <p className="mb-3 text-center text-xs text-muted-foreground">
              Microfone indisponível neste navegador. Use o campo abaixo para escrever.
            </p>
          ) : (
            <div className="mb-3 flex items-center justify-center">
              <button
                onClick={toggleListen}
                disabled={
                  status === "thinking" ||
                  status === "speaking" ||
                  status === "transcribing"
                }
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
                aria-label={status === "listening" ? "Parar e enviar" : "Falar"}
              >
                {status === "listening" ? "■" : "🎙️"}
              </button>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (status !== "idle") return;
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
              disabled={!text.trim() || status !== "idle"}
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

// ---------- Paywall Gate ----------

function PaywallGate({
  open,
  name,
  onConfirmPaid,
}: {
  open: boolean;
  name: string;
  onConfirmPaid: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  function copy() {
    navigator.clipboard?.writeText(PIX_KEY).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => {},
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl border border-secondary/40 bg-card p-6 shadow-[var(--shadow-sagrado)]">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-secondary/50 text-2xl text-secondary" style={{ background: "var(--gradient-noite)" }}>
            🔒
          </div>
          <p className="mt-4 text-[11px] uppercase tracking-[0.3em] text-secondary">
            Portão do Desafio
          </p>
          <h3 className="mt-2 font-display text-3xl leading-tight text-foreground">
            {name ? `${name}, ` : ""}sua jornada começa aqui.
          </h3>
          <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
            Para liberar o Desafio 28 dias completo e conversar com o mentor Aruanã por voz,
            confirme sua entrada com um Pix único de <strong className="text-foreground">R$ 28,00</strong>.
          </p>
        </div>

        <ul className="mt-5 space-y-2 rounded-2xl border border-border/60 bg-background/40 p-4 text-sm text-foreground/90">
          {[
            "28 dias de práticas ancestrais guiadas",
            "Banhos, defumações, meditações e canalizações",
            "Mentor Aruanã por voz — ilimitado",
            "Ativação do DMT natural pela prática",
          ].map((t) => (
            <li key={t} className="flex gap-2.5">
              <span className="mt-0.5 text-secondary">✦</span>
              <span className="leading-snug">{t}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-2xl border border-secondary/30 bg-background/60 p-4">
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="mx-auto block"
            aria-label="Ampliar QR Code"
          >
            <img
              src={pix28.url}
              alt="QR Code Pix R$ 28,00"
              className="mx-auto h-48 w-48 rounded-lg object-contain"
            />
          </button>
          <div className="mt-3 text-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Chave Pix (copia e cola)
          </div>
          <button
            onClick={copy}
            className="mt-2 w-full truncate rounded-full border border-secondary/40 px-3 py-2 text-xs text-secondary transition hover:bg-secondary/10"
          >
            {copied ? "✓ Copiado" : PIX_KEY}
          </button>
          <div className="mt-2 text-center text-[11px] text-muted-foreground">
            Titular: CAUAN DE JESUS DE QUEIROZ SANTOS · Inter
          </div>
        </div>

        <button
          onClick={onConfirmPaid}
          className="mt-5 w-full rounded-full px-6 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-sagrado)] transition hover:brightness-110"
          style={{ background: "var(--gradient-brasa)" }}
        >
          ✓ Já paguei — liberar meu acesso
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Envie o comprovante no WhatsApp cadastrado para confirmação manual.
        </p>
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setZoom(false)}
        >
          <img
            src={pix28.url}
            alt="QR Code Pix R$ 28,00 ampliado"
            className="max-h-[90vh] max-w-[90vw] rounded-xl bg-white p-3 object-contain"
          />
        </div>
      )}
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
