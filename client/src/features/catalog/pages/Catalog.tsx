import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { listProducts } from "@/features/catalog/catalogApi";
import type { Product } from "@/features/catalog/catalogTypes";
import { X, ChevronLeft, ChevronRight, Tag, Package, Search, MessageCircle } from "lucide-react";

// ─── Utilitário: pré-carrega uma lista de URLs de imagem ─────────────────────
function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls
      .filter(Boolean)
      .map(
        (url) =>
          new Promise<void>((resolve) => {
            const img = new window.Image();
            img.onload  = () => resolve();
            img.onerror = () => resolve(); // falha silenciosa — não bloqueia
            img.src = url;
          }),
      ),
  );
}

// ─── Identidade Visual ──────────────────────────────────────────────────────
const THEME = {
  PRIMARY: "#FFFFFF",    // Background principal
  SURFACE: "#F9F9F9",    // Surface (cards / seções)
  SECONDARY: "#C2A96B",  // Detalhes elegantes (dourado suave)
  ACCENT: "#8F7A3A",     // Accent (dourado escuro)
  DARK: "#0F0F0F",       // Dark (preto)
  TEXT: "#3A3426",       // Texto padrão
};

export default function Catalog() {
  const [, setLocation]   = useLocation();
  const searchString      = useSearch();                        // ?produto=123
  const produtoIdParam    = new URLSearchParams(searchString).get("produto");

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch]     = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]       = useState("");

  const [selected, setSelected]     = useState<Product | null>(null);
  const [galleryIdx, setGalleryIdx] = useState(0);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const result = await listProducts({ ativo: true });
        const data: Product[] = result.data;
        setProducts(data);

        // Pré-carrega todas as imagens principais antes de liberar o catálogo
        const imageUrls = data.map((p) => p.imagem_url).filter(Boolean) as string[];
        if (imageUrls.length > 0) {
          await preloadImages(imageUrls);
        }
      } catch (err) {
        console.error("Erro ao carregar catálogo:", err);
        setError("Não foi possível carregar os produtos.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Abre o modal automaticamente se vier com ?produto=<id>
  useEffect(() => {
    if (!produtoIdParam || products.length === 0) return;
    const produto = products.find((p) => String(p.id) === produtoIdParam);
    if (produto) {
      setSelected(produto);
      setGalleryIdx(0);
    }
  }, [produtoIdParam, products]);

  const filtered = products.filter((p) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return p.nome.toLowerCase().includes(s) || p.descricao.toLowerCase().includes(s);
  });

  function openModal(product: Product) {
    setSelected(product);
    setGalleryIdx(0);
  }

  function closeModal() {
    setSelected(null);
    setGalleryIdx(0);
  }

  const allImages = selected
    ? [
        ...(selected.imagem_url ? [selected.imagem_url] : []),
        ...(selected.imagens ?? []).map((i) => i.url),
      ]
    : [];

  function prevImg() { setGalleryIdx((i) => (i === 0 ? allImages.length - 1 : i - 1)); }
  function nextImg() { setGalleryIdx((i) => (i === allImages.length - 1 ? 0 : i + 1)); }

  useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft")  prevImg();
      if (e.key === "ArrowRight") nextImg();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, galleryIdx, allImages.length]);

  function buildWhatsAppUrl(product: Product): string {
    const phone = (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) ?? "";
    const number = phone.replace(/\D/g, "");

    const message = `Olá! Tenho interesse no produto *${product.nome}* que vi no catálogo. Pode me passar mais informações?`;

    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  return (
    <div className="min-h-screen flex flex-col font-inter" style={{ backgroundColor: THEME.PRIMARY }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 border-b border-brand-secondary/10"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.92)", backdropFilter: "blur(12px)" }}
      >
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-5 flex items-center justify-between">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 text-[10px] font-bold text-brand-dark hover:text-brand-secondary transition-colors cursor-pointer uppercase tracking-[0.2em]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Início
          </button>

          <div className="flex flex-col items-center">
            <h1 className="text-xl font-bold tracking-[0.3em] text-brand-dark uppercase font-cormorant">Catálogo</h1>
            <div className="h-px w-12 mt-1.5" style={{ backgroundColor: THEME.SECONDARY }} />
          </div>

          <div className="w-16" />
        </div>
      </header>

      {/* ── MAIN ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 px-4 sm:px-6 py-12 mx-auto w-full max-w-7xl">

        {/* Search */}
        <div className="mb-14 max-w-lg mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-secondary/70 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar na coleção..."
              className="w-full rounded-full border border-brand-secondary/70 bg-brand-surface/30 pl-11 pr-5 py-4 text-sm text-brand-dark shadow-sm outline-none transition focus:border-brand-secondary/40 focus:bg-brand-surface/50 placeholder:text-brand-secondary/70"
            />
          </div>
        </div>

        {/* States */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center gap-5 text-brand-secondary">
            <div className="h-10 w-10 rounded-full border-2 border-brand-secondary/20 border-t-brand-secondary animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Carregando curadoria...</p>
          </div>
        ) : error ? (
          <div className="py-24 text-center text-sm font-medium text-brand-secondary">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <Package className="h-12 w-12 text-brand-secondary/20 mx-auto mb-5" />
            <p className="text-xs font-bold uppercase tracking-widest text-brand-secondary/60">
              {search ? "Nenhum item encontrado nesta busca." : "Em breve novas peças exclusivas."}
            </p>
          </div>
        ) : (
          <>
            {/* Count label */}
            <p className="text-[9px] text-brand-dark font-bold uppercase tracking-[0.4em] mb-8">
              {filtered.length} {filtered.length === 1 ? "Peça Única" : "Peças Selecionadas"}
            </p>

            {/* Grid */}
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((product) => (
                <div
                  key={product.id}
                  onClick={() => openModal(product)}
                  className="group relative bg-white rounded-3xl overflow-hidden cursor-pointer border border-brand-secondary/10"
                  style={{
                    boxShadow: "0 2px 10px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)",
                    transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1), box-shadow 0.35s cubic-bezier(0.4,0,0.2,1), border-color 0.35s ease",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.boxShadow = "0 18px 44px rgba(0,0,0,0.10), 0 4px 14px rgba(194,169,107,0.10)";
                    el.style.transform = "translateY(-5px)";
                    el.style.borderColor = "rgba(194,169,107,0.25)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.boxShadow = "0 2px 10px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)";
                    el.style.transform = "translateY(0)";
                    el.style.borderColor = "rgba(194,169,107,0.10)";
                  }}
                >
                  {/* Promo badge */}
                  {product.promocao && (
                    <div
                      className="absolute top-3.5 left-3.5 z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-bold text-white uppercase tracking-[0.15em] shadow-md"
                      style={{ background: "linear-gradient(135deg, #C2A96B 0%, #8F7A3A 100%)" }}
                    >
                      <Tag className="h-2.5 w-2.5" />
                      Promoção
                    </div>
                  )}

                  {/* Image */}
                  <div className="aspect-square overflow-hidden bg-brand-surface/60 p-5">
                    {product.imagem_url ? (
                      <img
                        src={product.imagem_url}
                        alt={product.nome}
                        className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-10 w-10 text-brand-secondary/15" />
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="h-px mx-5" style={{ background: "rgba(194,169,107,0.12)" }} />

                  {/* Info */}
                  <div className="px-5 pt-4 pb-6">
                    <p className="text-[17px] font-bold text-brand-dark leading-snug line-clamp-2 mb-1.5 font-cormorant">
                      {product.nome}
                    </p>
                    {product.descricao && (
                      <p className="text-[10px] text-brand-text/40 line-clamp-1 leading-relaxed mb-4 uppercase tracking-wider">
                        {product.descricao}
                      </p>
                    )}
                    <p className="text-[15px] font-bold tabular-nums text-brand-dark">
                      R$ {product.preco.toFixed(2)}
                    </p>
                  </div>

                  {/* Hover accent line */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-0.5 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
                    style={{ background: "linear-gradient(90deg, #C2A96B, #8F7A3A)" }}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="py-10 text-center border-t border-brand-secondary/10 mt-16 flex flex-col items-center gap-5">
        <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain" />
        <p className="text-[10px] text-brand-text/40 uppercase tracking-[0.2em]">© 2026 Dry Store</p>
      </footer>

      {/* ── MODAL ──────────────────────────────────────────────────────────── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(10, 10, 10, 0.70)", backdropFilter: "blur(16px)" }}
          onClick={closeModal}
        >
          <div
            className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-[2.5rem] bg-white border border-brand-secondary/15"
            style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.20), 0 8px 24px rgba(0,0,0,0.10)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={closeModal}
              className="absolute right-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white border border-brand-secondary/15 text-brand-dark hover:bg-brand-surface hover:border-brand-secondary/30 transition-all cursor-pointer shadow-sm"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Main image */}
            <div
              className="relative overflow-hidden bg-brand-surface/50 group"
              style={{ aspectRatio: "4/3" }}
            >
              {allImages.length > 0 ? (
                <img
                  src={allImages[galleryIdx]}
                  alt={selected.nome}
                  className="w-full h-full object-contain transition-opacity duration-500 p-6"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Package className="h-20 w-20 text-brand-secondary/10" />
                </div>
              )}

              {selected.promocao && (
                <div
                  className="absolute top-5 left-5 flex items-center gap-1.5 rounded-full px-4 py-2 text-[10px] font-bold text-white shadow-md uppercase tracking-[0.15em]"
                  style={{ background: "linear-gradient(135deg, #C2A96B 0%, #8F7A3A 100%)" }}
                >
                  <Tag className="h-3 w-3" /> Promoção
                </div>
              )}

              {allImages.length > 1 && (
                <>
                  <button
                    onClick={prevImg}
                    className="absolute left-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white border border-brand-secondary/15 text-brand-dark shadow-md transition hover:border-brand-secondary/30 opacity-0 group-hover:opacity-100"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={nextImg}
                    className="absolute right-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white border border-brand-secondary/15 text-brand-dark shadow-md transition hover:border-brand-secondary/30 opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div
                    className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white rounded-full px-4 py-1.5 uppercase tracking-[0.3em]"
                    style={{ background: "rgba(10, 10, 10, 0.45)", backdropFilter: "blur(6px)" }}
                  >
                    {galleryIdx + 1} / {allImages.length}
                  </div>
                </>
              )}
            </div>

            {/* Divider */}
            <div className="h-px" style={{ background: "rgba(194,169,107,0.12)" }} />

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto px-7 pt-5 pb-4 scrollbar-hide">
                {allImages.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setGalleryIdx(i)}
                    className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 transition-all shadow-sm"
                    style={{
                      borderColor: i === galleryIdx ? THEME.SECONDARY : "rgba(194,169,107,0.12)",
                      boxShadow: i === galleryIdx ? `0 0 0 1px ${THEME.SECONDARY}` : "none",
                    }}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Details */}
            <div className="px-8 pt-7 pb-10">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <h2 className="text-4xl font-bold text-brand-dark leading-tight flex-1 font-cormorant">
                  {selected.nome}
                </h2>
                <div className="shrink-0 flex flex-col items-start sm:items-end gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-secondary/60">Preço</span>
                  <span className="text-3xl font-bold tabular-nums leading-none text-brand-dark">
                    R$ {selected.preco.toFixed(2)}
                  </span>
                </div>
              </div>

              {selected.descricao && (
                <p className="text-base text-brand-text/55 leading-relaxed mb-8">{selected.descricao}</p>
              )}

              {/* Separator before CTA */}
              <div className="h-px mb-8" style={{ background: "rgba(194,169,107,0.10)" }} />

              <a
                href={buildWhatsAppUrl(selected)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-3 rounded-full px-10 py-5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{
                  backgroundColor: THEME.DARK,
                  boxShadow: "0 4px 20px rgba(15,15,15,0.22), 0 1px 4px rgba(15,15,15,0.12)",
                }}
              >
                <MessageCircle className="h-5 w-5" />
                Adquirir Peça Exclusiva
              </a>
              <p className="mt-5 text-center text-[10px] text-brand-secondary/45 uppercase tracking-[0.45em]">
                Atendimento Personalizado — Dry Store
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
