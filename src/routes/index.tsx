import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import hero from "@/assets/cauan-hero.jpg";
import print7Magos from "@/assets/depoimentos-7-magos.jpeg.asset.json";
import print7Dias from "@/assets/depoimentos-7-dias.jpeg.asset.json";
import printInstagram from "@/assets/instagram-cauanpataxo.jpeg.asset.json";
import printSuporte from "@/assets/depoimento-suporte.jpeg.asset.json";
import printInicio from "@/assets/instagram-inicio.jpeg.asset.json";
import printMagosVendas from "@/assets/grupo-7-magos-vendas.jpeg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cauan Pataxó — Ancestralidade, Hermetismo e Natureza" },
      { name: "description", content: "Descubra seu perfil espiritual com Cauan Pataxó, jovem indígena que leva a cultura ancestral, o hermetismo e a conexão com a natureza para outros jovens." },
      { property: "og:title", content: "Cauan Pataxó — Descubra seu perfil ancestral" },
      { property: "og:description", content: "Teste de perfil espiritual, Desafio 28 Dias e grupo fechado com Cauan Pataxó." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const WHATS = "https://wa.me/5577981242361?text=" + encodeURIComponent("Olá Cauan, tenho uma dúvida sobre o Desafio 28 Dias.");
const CHECKOUT = "https://pay.kiwify.com.br/EoiEnhd";
const GROUP = "https://chat.whatsapp.com/JXqSD1uJLEwCGxvYHim5lh?mode=gi_t";
const INSTA = "https://www.instagram.com/cauanpataxo/";

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


function Home() {
  const [stage, setStage] = useState<"intro" | "quiz" | "lead" | "result">("intro");
  const [answers, setAnswers] = useState<ProfileKey[]>([]);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);
  const quizRef = useRef<HTMLDivElement | null>(null);

  const profile: ProfileKey | null = answers.length
    ? (Object.entries(
        answers.reduce<Record<string, number>>((a, k) => ((a[k] = (a[k] || 0) + 1), a), {}),
      ).sort((a, b) => b[1] - a[1])[0][0] as ProfileKey)
    : null;

  const startQuiz = () => {
    setAnswers([]);
    setStage("quiz");
    setTimeout(() => quizRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const pick = (p: ProfileKey) => {
    const next = [...answers, p];
    setAnswers(next);
    if (next.length >= QUESTIONS.length) setStage("lead");
  };

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim().slice(0, 80);
    const w = whatsapp.replace(/\D/g, "").slice(0, 15);
    if (n.length < 2 || w.length < 10) return;
    setSaving(true);
    try {
      let { data } = await supabase.auth.getSession();
      if (!data.session) await supabase.auth.signInAnonymously();
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("leads").insert({ name: n, whatsapp: w, intention: "teste-perfil", profile, user_id: u.user?.id });
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
    setStage("result");
  };

  const [booting, setBooting] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 2600);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    document.body.style.overflow = booting ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [booting]);

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <CandleSplash visible={booting} />
      <StarsBackdrop />
      <div className="relative">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <span className="font-display text-xl text-foreground">Cauan Pataxó</span>
          <a href={INSTA} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-primary">@cauanpataxo</a>
        </nav>

        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-4 md:grid-cols-2 md:pt-10">
          <div className="order-2 md:order-1">
            <p className="mb-3 text-xs uppercase tracking-[0.25em] text-primary">Jovem indígena · Hermetismo · Natureza</p>
            <h1 className="font-display text-4xl leading-tight text-foreground md:text-6xl">
              A sabedoria da mata chegando à nova geração.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Sou Cauan Pataxó. Levo a cultura do meu povo, as leis herméticas e a conexão com a natureza para jovens que querem
              lembrar quem são. Descubra seu perfil ancestral em 1 minuto.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button onClick={startQuiz} className="rounded-full bg-primary px-7 py-4 font-semibold text-primary-foreground shadow-lg transition hover:opacity-90">
                Descobrir meu perfil
              </button>
              <a href={CHECKOUT} target="_blank" rel="noreferrer" className="rounded-full border border-primary/50 px-7 py-4 text-center font-semibold text-foreground hover:bg-primary/10">
                Entrar no Desafio 28 Dias
              </a>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <img src={hero} alt="Cauan Pataxó em meio à mata, com colar de miçangas vermelhas" width={1024} height={1280} className="mx-auto aspect-[4/5] w-full max-w-md rounded-[2rem] border border-border object-cover object-top shadow-2xl" />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Cultura Pataxó", "Cantos, banhos, defumações e rezas transmitidas pelos mais velhos."],
              ["Hermetismo", "As 7 leis herméticas aplicadas à rotina, aos estudos e aos projetos."],
              ["Conexão com a natureza", "Práticas simples para voltar ao corpo, à terra e ao propósito."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur">
                <h3 className="font-display text-xl text-foreground">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-16">
          <p className="mb-2 text-center text-xs uppercase tracking-[0.25em] text-primary">Prova social</p>
          <h2 className="text-center font-display text-3xl text-foreground md:text-4xl">Quem caminha junto, sente a diferença</h2>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["100 mil", "seguidores no Instagram"],
              ["3,8 mi", "visualizações em 30 dias"],
              ["1.200+", "publicações de conteúdo"],
              ["3", "grupos ativos de estudo"],
            ].map(([n, l]) => (
              <div key={l} className="rounded-2xl border border-primary/30 bg-card/70 p-5 text-center backdrop-blur">
                <div className="font-display text-3xl text-primary md:text-4xl">{n}</div>
                <div className="mt-1 text-xs text-muted-foreground md:text-sm">{l}</div>
              </div>
            ))}
          </div>
          <p className="mt-10 mb-3 text-center text-xs uppercase tracking-[0.25em] text-primary">Prints reais</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                src: print7Magos.url,
                cap: "Grupo Os 7 Magos",
                alt: "Depoimento de participante no grupo Os 7 Magos no WhatsApp",
              },
              {
                src: print7Dias.url,
                cap: "Grupo 7 dias de abertura de caminhos",
                alt: "Depoimentos de participantes no grupo 7 dias de abertura de caminhos no WhatsApp",
              },
              {
                src: printInstagram.url,
                cap: "@cauanpataxo no Instagram",
                alt: "Perfil de Cauan Pataxó no Instagram com 100 mil seguidores e 3,8 milhões de visualizações em 30 dias",
              },
              {
                src: printSuporte.url,
                cap: "“Um espaço pra respirar”",
                alt: "Depoimento: o grupo se tornou um lugar de suporte, um espaço pra respirar",
              },
              {
                src: printMagosVendas.url,
                cap: "Os 7 Magos · troca diária entre membros",
                alt: "Conversa entre membros do grupo Os 7 Magos sobre vendas e clientes",
              },
            ].map((p) => (
              <figure key={p.cap} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card/70 backdrop-blur">
                <img src={p.src} alt={p.alt} loading="lazy" className="max-h-[520px] w-full object-cover object-top" />
                <figcaption className="px-4 py-3 text-xs text-muted-foreground">{p.cap}</figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">Relatos reais de participantes dos grupos de estudo, compartilhados com autorização.</p>

          <div className="mt-12 grid items-center gap-6 rounded-3xl border border-primary/30 bg-card/70 p-6 backdrop-blur md:grid-cols-[1fr_1.4fr] md:p-8">
            <div className="grid grid-cols-2 gap-3">
              <figure className="overflow-hidden rounded-xl border border-border">
                <img src={printInicio.url} alt="Perfil antigo de Cauan com 709 seguidores" loading="lazy" className="h-64 w-full object-cover object-top" />
                <figcaption className="bg-background/60 py-2 text-center text-xs text-muted-foreground">Antes · 709</figcaption>
              </figure>
              <figure className="overflow-hidden rounded-xl border border-primary/50">
                <img src={printInstagram.url} alt="Perfil atual com 100 mil seguidores" loading="lazy" className="h-64 w-full object-cover object-top" />
                <figcaption className="bg-primary/15 py-2 text-center text-xs text-primary">Hoje · 100 mil</figcaption>
              </figure>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-primary">A caminhada</p>
              <h3 className="mt-2 font-display text-3xl text-foreground">De 709 para 100 mil pessoas</h3>
              <p className="mt-3 text-muted-foreground">
                Não foi sorte. Foi disciplina, raiz e as leis herméticas aplicadas todo dia. É exatamente esse caminho que eu abro
                dentro da Nova Ordem.
              </p>
              <a href={CHECKOUT} target="_blank" rel="noreferrer" className="mt-5 inline-block rounded-full bg-primary px-7 py-3 font-semibold text-primary-foreground shadow-lg hover:opacity-90">
                Quero entrar na Nova Ordem →
              </a>
            </div>
          </div>
        </section>

        <section ref={quizRef} className="mx-auto max-w-2xl scroll-mt-6 px-5 pb-20">
          {stage === "intro" && (
            <div className="rounded-3xl border border-border bg-card/80 p-8 text-center backdrop-blur">
              <h2 className="font-display text-3xl text-foreground">Qual é o seu perfil ancestral?</h2>
              <p className="mt-3 text-muted-foreground">Guardião, Curador, Visionário ou Semeador. Responda {QUESTIONS.length} perguntas rápidas.</p>
              <button onClick={startQuiz} className="mt-6 rounded-full bg-primary px-7 py-3 font-semibold text-primary-foreground">Começar o teste</button>
            </div>
          )}

          {stage === "quiz" && (
            <div className="rounded-3xl border border-border bg-card/80 p-6 backdrop-blur md:p-8">
              <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
                <button onClick={() => (answers.length ? setAnswers(answers.slice(0, -1)) : setStage("intro"))}>← Voltar</button>
                <span>{answers.length + 1} / {QUESTIONS.length}</span>
              </div>
              <div className="mb-6 h-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${(answers.length / QUESTIONS.length) * 100}%` }} />
              </div>
              <h3 className="font-display text-2xl text-foreground">{QUESTIONS[answers.length].q}</h3>
              <div className="mt-5 grid gap-3">
                {QUESTIONS[answers.length].options.map((o) => (
                  <button key={o.label} onClick={() => pick(o.profile)} className="rounded-xl border border-border bg-background/40 p-4 text-left text-foreground transition hover:border-primary hover:bg-primary/10">
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {stage === "lead" && (
            <form onSubmit={submitLead} className="rounded-3xl border border-border bg-card/80 p-8 backdrop-blur">
              <h3 className="font-display text-2xl text-foreground">Seu perfil está pronto ✦</h3>
              <p className="mt-2 text-sm text-muted-foreground">Deixe seu nome e WhatsApp para ver o resultado.</p>
              <input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" className="mt-5 w-full rounded-xl border border-input bg-background/60 p-3 text-foreground" />
              <input required inputMode="tel" maxLength={20} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp com DDD" className="mt-3 w-full rounded-xl border border-input bg-background/60 p-3 text-foreground" />
              <button disabled={saving} className="mt-5 w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60">
                {saving ? "Revelando..." : "Ver meu perfil"}
              </button>
            </form>
          )}

          {stage === "result" && profile && (
            <div className="rounded-3xl border border-primary/40 bg-card/90 p-8 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.25em] text-primary">Seu perfil ancestral</p>
              <h3 className="mt-2 font-display text-4xl text-foreground">{PROFILES[profile].symbol} {PROFILES[profile].name}</h3>
              <p className="mt-3 text-lg text-foreground">{PROFILES[profile].essence}</p>
              <dl className="mt-5 space-y-3 text-sm">
                <div><dt className="font-semibold text-primary">Força</dt><dd className="text-muted-foreground">{PROFILES[profile].strength}</dd></div>
                <div><dt className="font-semibold text-primary">Sombra</dt><dd className="text-muted-foreground">{PROFILES[profile].shadow}</dd></div>
                <div><dt className="font-semibold text-primary">Ritual de hoje</dt><dd className="text-muted-foreground">{PROFILES[profile].ritual}</dd></div>
              </dl>
              <a href={CHECKOUT} target="_blank" rel="noreferrer" className="mt-7 block rounded-full bg-primary py-4 text-center font-semibold text-primary-foreground">
                Ativar meu perfil no Desafio 28 Dias
              </a>
              <button onClick={startQuiz} className="mt-3 w-full text-sm text-muted-foreground">Refazer o teste</button>
            </div>
          )}
        </section>

        <section id="nova-ordem" className="mx-auto max-w-4xl px-5 pb-24">
          <div className="relative overflow-hidden rounded-[2rem] border-2 border-primary/60 bg-card/90 p-7 shadow-2xl backdrop-blur md:p-12">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
            <div className="relative text-center">
              <span className="inline-block rounded-full border border-primary/50 bg-primary/10 px-4 py-1 text-xs uppercase tracking-[0.25em] text-primary">Acesso exclusivo</span>
              <h2 className="mt-4 font-display text-4xl leading-tight text-foreground md:text-5xl">A Nova Ordem</h2>
              <p className="mx-auto mt-3 max-w-xl text-lg text-muted-foreground">
                O material e os ensinamentos que eu não publico no Instagram. Um caminho guiado de 28 dias para lembrar quem você é.
              </p>
            </div>
            <div className="relative mt-8 grid gap-3 md:grid-cols-2">
              {[
                ["Conteúdo exclusivo", "Ensinamentos fechados da Nova Ordem, só para membros."],
                ["Desafio 28 Dias", "Banhos, defumações, orações e meditações guiadas dia a dia."],
                ["Leis herméticas na prática", "As 7 leis aplicadas à rotina, aos estudos e aos projetos."],
                ["Grupo fechado com Cauan", "Suporte diário no WhatsApp com quem caminha junto."],
              ].map(([t, d]) => (
                <div key={t} className="flex gap-3 rounded-2xl border border-border bg-background/40 p-4 text-left">
                  <span className="mt-0.5 text-primary">✦</span>
                  <div>
                    <div className="font-semibold text-foreground">{t}</div>
                    <div className="text-sm text-muted-foreground">{d}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="relative mt-8 text-center">
              <a href={CHECKOUT} target="_blank" rel="noreferrer" className="block w-full rounded-full bg-primary px-8 py-5 text-lg font-bold text-primary-foreground shadow-xl transition hover:scale-[1.02] hover:opacity-95 md:inline-block md:w-auto">
                Garantir meu acesso à Nova Ordem →
              </a>
              <p className="mt-3 text-xs text-muted-foreground">Pagamento seguro pela Kiwify · Acesso liberado após a compra</p>
              <p className="mt-4 text-sm text-muted-foreground">
                Já comprou? <a href={GROUP} target="_blank" rel="noreferrer" className="text-primary underline">Entre no grupo fechado</a>
                {" · "}
                <a href={WHATS} target="_blank" rel="noreferrer" className="text-primary underline">Tirar dúvida no WhatsApp</a>
              </p>
            </div>
          </div>
        </section>

        <footer className="border-t border-border px-5 py-8 text-center text-sm text-muted-foreground">
          Cauan Pataxó · <a href={INSTA} target="_blank" rel="noreferrer" className="hover:text-primary">Instagram</a>
        </footer>
      </div>

      <a href={WHATS} target="_blank" rel="noreferrer" aria-label="Tirar dúvidas no WhatsApp"
        className="fixed bottom-5 right-5 z-50 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-xl">
        Dúvidas? WhatsApp
      </a>
    </main>
  );
}

function CandleSplash({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden={!visible}
      role="status"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-700 ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <div className="relative flex h-40 w-40 items-end justify-center">
        <div className="absolute top-2 h-32 w-32 rounded-full bg-primary/30 blur-3xl" style={{ animation: "candle-glow 2.2s ease-in-out infinite" }} />
        <div className="absolute bottom-[4.5rem] h-14 w-8 origin-bottom rounded-[50%_50%_50%_50%/70%_70%_30%_30%] bg-gradient-to-t from-primary via-primary/80 to-transparent" style={{ animation: "flame-flicker 0.9s ease-in-out infinite" }} />
        <div className="relative h-20 w-9 rounded-t-sm bg-gradient-to-b from-foreground/90 to-foreground/60 shadow-lg" />
      </div>
      <p className="mt-6 font-display text-2xl text-foreground">Acendendo a vela...</p>
      <p className="mt-1 text-sm text-muted-foreground">Cauan Pataxó</p>
    </div>
  );
}

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
