// Home.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { listProducts } from "@/features/catalog/catalogApi";
import type { Product } from "@/features/catalog/catalogTypes";
import {
  Package,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Tag,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Battery,
} from "lucide-react";

const WHATSAPP_NUMBER  = import.meta.env.VITE_WHATSAPP_NUMBER;
const WHATSAPP_MESSAGE = encodeURIComponent("Olá! Gostaria de um atendimento personalizado.");

// ─── Identidade Visual ──────────────────────────────────────────────────────
const THEME = {
  PRIMARY: "#FFFFFF",    // Background principal
  SURFACE: "#F9F9F9",    // Surface (cards / seções)
  SECONDARY: "#C2A96B",  // Detalhes elegantes (dourado suave)
  ACCENT: "#8F7A3A",     // Accent (dourado escuro)
  DARK: "#0F0F0F",       // Dark (preto)
  TEXT: "#3A3426",       // Texto padrão
  FONTS: {
    TITLE: "'Cormorant Garamond', serif",
    MAIN: "'Inter', sans-serif"
  }
};

const SLIDE_INTERVAL = 5000;
const SLIDE_MS       = 500;

function SlideCarousel({
  count,
  renderSlide,
  dotActiveColor   = THEME.DARK,
  dotInactiveColor = "rgba(15, 15, 15, 0.1)",
}: {
  count: number;
  renderSlide: (index: number) => React.ReactNode;
  dotActiveColor?: string;
  dotInactiveColor?: string;
}) {
  const [position, setPosition]       = useState(0);
  const [animated, setAnimated]       = useState(true);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX]     = useState<number | null>(null);
  const totalCells                    = count + 1;
  const trackRef                      = useRef<HTMLDivElement>(null);

  const advance = useCallback(() => {
    setAnimated(true);
    setPosition((p) => p + 1);
  }, []);

  const goBack = useCallback(() => {
    setAnimated(true);
    setPosition((p) => (p === 0 ? count - 1 : p - 1));
  }, [count]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchEndX(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const minSwipeDistance = 50;
    if (distance > minSwipeDistance) advance();
    else if (distance < -minSwipeDistance) goBack();
  };

  function handleTransitionEnd() {
    if (position === count) {
      setAnimated(false);
      setPosition(0);
    }
  }

  useEffect(() => {
    if (!animated) {
      const id = requestAnimationFrame(() => setAnimated(true));
      return () => cancelAnimationFrame(id);
    }
  }, [animated]);

  useEffect(() => {
    if (count <= 1) return;

    let t: ReturnType<typeof setInterval> | null = null;

    const startAutoplay = () => {
      if (t) clearInterval(t);
      t = setInterval(advance, SLIDE_INTERVAL);
    };

    startAutoplay();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (t) clearInterval(t);
        t = null;
      } else {
        // Se preso no slide clone (position >= count), resetar sem animação
        setPosition(prev => {
          if (prev >= count) {
            setAnimated(false);
            return 0;
          }
          return prev;
        });
        startAutoplay();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      if (t) clearInterval(t);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [count, advance]);

  const activeDot = position % count;

  return (
    <div
      className="relative rounded-3xl shadow-sm border border-brand-secondary/10 group aspect-[4/5] sm:aspect-[16/7]"
      style={{ overflow: "hidden", position: "relative", backgroundColor: THEME.SURFACE }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={trackRef}
        onTransitionEnd={handleTransitionEnd}
        style={{
          position:  "absolute",
          top:       0,
          left:      0,
          bottom:    0,
          width:     `${totalCells * 100}%`,
          display:   "flex",
          transform: `translateX(-${(position / totalCells) * 100}%)`,
          transition: animated ? `transform ${SLIDE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)` : "none",
          willChange: "transform",
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ width: `${100 / totalCells}%`, height: "100%", flexShrink: 0 }}>
            {renderSlide(i)}
          </div>
        ))}
        <div style={{ width: `${100 / totalCells}%`, height: "100%", flexShrink: 0 }}>
          {renderSlide(0)}
        </div>
      </div>

      {count > 1 && (
        <>
          <button onClick={goBack} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full hidden sm:flex items-center justify-center shadow-sm transition opacity-0 group-hover:opacity-100 hover:scale-110 border border-brand-secondary/20" style={{ background: "#fff", color: THEME.DARK }}>
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button onClick={advance} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full hidden sm:flex items-center justify-center shadow-sm transition opacity-0 group-hover:opacity-100 hover:scale-110 border border-brand-secondary/20" style={{ background: "#fff", color: THEME.DARK }}>
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {count > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-3">
          {Array.from({ length: count }).map((_, i) => (
            <button key={i} onClick={() => { setAnimated(true); setPosition(i); }} className="rounded-full transition-all duration-300" style={{ width: i === activeDot ? "32px" : "8px", height: "8px", background: i === activeDot ? dotActiveColor : dotInactiveColor }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Fallback Slides ────────────────────────────────────────────────────────

type FallbackSlide = {
  eyebrow: string; headline: string; sub: string; cta: string; Icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
};

const FALLBACK_SLIDES: FallbackSlide[] = [
  { eyebrow: "Excelência Premium", headline: "Seu celular merece o extraordinário", sub: "Capinhas selecionadas que fundem proteção de elite com estética moderna.", cta: "Ver Coleção", Icon: ShieldCheck },
  { eyebrow: "Tecnologia de Ponta", headline: "Energia para sua rotina", sub: "Acessórios projetados para performance superior e durabilidade tecnológica.", cta: "Ver Acessórios", Icon: Battery },
  { eyebrow: "Estilo Moderno", headline: "Acessórios com personalidade", sub: "Eleve seu setup com peças que expressam inovação e estilo tecnológico.", cta: "Explorar Tudo", Icon: Sparkles },
];

function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(urls.filter(Boolean).map(url => new Promise<void>((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(); img.onerror = () => resolve(); img.src = url;
  })));
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [promos, setPromos] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    listProducts({ promocao: true, ativo: true })
      .then(async (res) => {
        const data: Product[] = res.data;
        setPromos(data);
        const imageUrls = data.map((p) => p.imagem_url).filter(Boolean) as string[];
        if (imageUrls.length > 0) await preloadImages(imageUrls);
      })
      .catch(() => setPromos([]))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: THEME.PRIMARY }}>
        <div className="w-14 h-14 rounded-full border-4 animate-spin" style={{ borderColor: THEME.SURFACE, borderTopColor: THEME.SECONDARY }} />
      </div>
    );
  }

  const hasPromos = promos.length > 0;

  function goWhatsApp() {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`, "_blank", "noopener,noreferrer");
  }

  function renderPromoSlide(i: number) {
    const p = promos[i];
    return (
      <div className="w-full h-full relative flex flex-col sm:flex-row items-start sm:items-center justify-end sm:justify-between px-8 sm:px-12 pb-10 sm:pb-0 sm:py-0 overflow-hidden" style={{ background: THEME.SURFACE }}>
        {/* Mobile Background */}
        <div className="absolute inset-0 block sm:hidden">
          {p?.imagem_url && <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent sm:hidden" />
        </div>

        {/* Desktop Background Subtle Image */}
        <div className="absolute inset-0 hidden sm:block opacity-[0.12]">
          {p?.imagem_url && <img src={p.imagem_url} alt="" className="w-full h-full object-cover" />}
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col gap-3 sm:gap-4 max-w-sm sm:max-w-lg text-left items-start sm:mt-0 [text-shadow:0_2px_8px_rgba(0,0,0,0.65)] sm:[text-shadow:none]">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest" style={{ background: THEME.SECONDARY, color: "#fff" }}>Promoção</span>
          <p className="text-white sm:text-brand-text font-bold text-3xl sm:text-5xl leading-tight" style={{ fontFamily: THEME.FONTS.TITLE }}>{p?.nome}</p>
          <p className="text-white/80 sm:text-brand-text/70 text-sm sm:text-base leading-relaxed line-clamp-2 max-w-xs">{p?.descricao}</p>
          <p className="font-bold text-3xl sm:text-4xl mt-2 text-white sm:text-brand-dark">R$ {p?.preco.toFixed(2)}</p>
          <button onClick={() => setLocation(`/catalogo?produto=${p?.id}`)} className="mt-6 inline-flex items-center gap-2 rounded-full px-10 py-4 text-xs sm:text-sm font-bold shadow-md transition hover:bg-brand-accent active:scale-95 cursor-pointer" style={{ background: THEME.DARK, color: "#fff" }}>Ver Produto <ArrowRight className="h-4 w-4" /></button>
        </div>

        {/* Desktop Product Image (Clean) */}
        <div className="hidden sm:flex relative z-10 w-1/2 h-full items-center justify-center p-8">
          {p?.imagem_url && (
            <img
              src={p.imagem_url}
              alt={p.nome}
              className="max-w-full max-h-[85%] object-contain rounded-2xl"
              style={{ filter: "drop-shadow(0 16px 40px rgba(0,0,0,0.18)) drop-shadow(0 4px 12px rgba(0,0,0,0.10))" }}
            />
          )}
        </div>
      </div>
    );
  }

  function renderFallbackSlide(i: number) {
    const slide = FALLBACK_SLIDES[i];
    const { Icon } = slide;
    return (
      <div className="w-full h-full flex flex-col sm:flex-row items-center sm:justify-between px-10 sm:px-16 pt-20 sm:pt-0" style={{ background: THEME.SURFACE }}>
        <div className="flex flex-col gap-4 max-md sm:max-w-md text-center sm:text-left">
          <span className="inline-flex self-center sm:self-start items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full" style={{ background: "rgba(194, 169, 107, 0.08)", color: THEME.ACCENT, border: `1px solid ${THEME.SECONDARY}30` }}>{slide.eyebrow}</span>
          <p className="text-brand-text font-bold text-3xl sm:text-5xl leading-tight" style={{ fontFamily: THEME.FONTS.TITLE }}>{slide.headline}</p>
          <p className="text-brand-text/60 text-sm sm:text-lg leading-relaxed max-w-xs mx-auto sm:mx-0">{slide.sub}</p>
          <button onClick={() => setLocation("/catalogo")} className="self-center sm:self-start mt-10 inline-flex items-center gap-2 rounded-full px-12 py-4.5 text-sm font-bold shadow-md transition hover:bg-brand-accent active:scale-95 cursor-pointer" style={{ background: THEME.DARK, color: "#fff" }}>{slide.cta} <ArrowRight className="h-4 w-4" /></button>
        </div>
        <div className="flex mt-14 sm:mt-0 w-32 h-32 rounded-full items-center justify-center shrink-0" style={{ background: "rgba(194, 169, 107, 0.03)", border: `1px solid ${THEME.SECONDARY}15` }}>
          <Icon className="h-16 w-16" style={{ color: THEME.SECONDARY }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: THEME.PRIMARY, color: THEME.TEXT, fontFamily: THEME.FONTS.MAIN }}>
      <header className="w-full flex flex-col items-center pt-3 pb-10 px-6" style={{ background: THEME.SURFACE }}>
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center text-center">
          <div className="mb-1 flex items-center justify-center">
            <img src="/logo.png" alt="Logo" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight mb-8 text-brand-dark" style={{ fontFamily: THEME.FONTS.TITLE, letterSpacing: "-0.01em" }}>Dry Store</h1>
          <p className="text-[10px] sm:text-xs text-brand-secondary uppercase font-bold mb-10 tracking-[0.5em]">Tecnologia & Proteção de Elite</p>
          <p className="text-lg sm:text-xl text-brand-text/70 max-w-xl leading-relaxed mb-14">Onde a inovação encontra a máxima segurança. Descubra nossa curadoria de acessórios projetados para o futuro do seu dispositivo.</p>
          <div className="flex flex-row justify-center gap-4 w-full">
            <button 
              onClick={() => setLocation("/catalogo")} 
              className="inline-flex items-center justify-center rounded-full px-6 py-4 text-xs sm:text-sm font-bold text-white shadow-md transition hover:bg-brand-accent active:scale-95 cursor-pointer flex-1 max-w-[200px]" 
              style={{ background: THEME.DARK, height: "56px" }}
            >
              Explorar Coleção
            </button>
            <button 
              onClick={goWhatsApp} 
              className="inline-flex items-center justify-center rounded-full px-6 py-4 text-xs sm:text-sm font-bold shadow-sm transition hover:bg-white active:scale-95 cursor-pointer bg-brand-surface border border-brand-secondary/20 flex-1 max-w-[200px]" 
              style={{ color: THEME.DARK, height: "56px" }}
            >
              Atendimento Digital
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 pt-10 pb-24 flex flex-col gap-32">
        <section>
          <SlideCarousel count={hasPromos ? promos.length : FALLBACK_SLIDES.length} renderSlide={hasPromos ? renderPromoSlide : renderFallbackSlide} />
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-10">
          <div onClick={goWhatsApp} className="group relative flex flex-col items-center text-center rounded-[3rem] p-14 shadow-sm transition hover:shadow-md hover:-translate-y-1 cursor-pointer bg-brand-surface border border-brand-secondary/10">
            <div className="w-20 h-20 flex items-center justify-center mb-10 rounded-full bg-white/40" style={{ color: THEME.SECONDARY }}><MessageCircle className="h-10 w-10" /></div>
            <p className="text-2xl font-bold mb-5 text-brand-dark" style={{ fontFamily: THEME.FONTS.TITLE }}>Suporte Especializado</p>
            <p className="text-brand-text/60 mb-10 leading-relaxed">Consultoria digital via WhatsApp para garantir a melhor escolha.</p>
            <span className="text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2" style={{ color: THEME.ACCENT }}>WhatsApp Direct <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
          </div>
          <div onClick={() => setLocation("/catalogo")} className="group relative flex flex-col items-center text-center rounded-[3rem] p-14 shadow-sm transition hover:shadow-md hover:-translate-y-1 cursor-pointer bg-brand-surface border border-brand-secondary/10">
            <div className="w-20 h-20 flex items-center justify-center mb-10 rounded-full bg-white/40" style={{ color: THEME.SECONDARY }}><Package className="h-10 w-10" /></div>
            <p className="text-2xl font-bold mb-5 text-brand-dark" style={{ fontFamily: THEME.FONTS.TITLE }}>Catálogo Digital</p>
            <p className="text-brand-text/60 mb-10 leading-relaxed">Explore nossa seleção de acessórios e produtos personalizáveis.</p>
            <span className="text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2" style={{ color: THEME.ACCENT }}>Ver Catálogo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
          </div>
        </section>

        <section className="rounded-[4rem] p-20 flex flex-col items-center text-center gap-10 shadow-sm border border-brand-secondary/10" style={{ background: THEME.SURFACE }}>
          <ShieldCheck className="h-16 w-16" style={{ color: THEME.SECONDARY }} />
          <p className="text-brand-dark text-4xl sm:text-6xl font-bold" style={{ fontFamily: THEME.FONTS.TITLE }}>Segurança Robusta</p>
          <p className="text-brand-text/60 text-lg max-w-xl leading-relaxed">Desenvolvido com precisão para oferecer o equilíbrio perfeito entre engenharia de proteção e design moderno.</p>
          <button onClick={() => setLocation("/catalogo")} className="mt-10 inline-flex items-center gap-3 rounded-full px-14 py-5 text-sm font-bold transition hover:bg-brand-accent active:scale-95 cursor-pointer shadow-md" style={{ background: THEME.DARK, color: "#fff" }}>Conhecer Coleção <ArrowRight className="h-5 w-5" /></button>
        </section>
      </main>

      <footer className="w-full py-12 px-6 text-center border-t border-brand-secondary/10 mt-16" style={{ background: THEME.SURFACE }}>
        <div className="flex flex-col items-center gap-8">
          <img src="/logo.png" alt="Logo" className="h-12 w-12 object-contain" />
          <p className="text-[10px] font-bold tracking-[0.6em] uppercase text-brand-dark">Dry Store</p>
        <p className="text-[10px] text-brand-text/40 uppercase tracking-[0.2em]">© 2026 Dry Store</p>
        </div>
      </footer>
    </div>
  );
}
