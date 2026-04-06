// Comercial.tsx
import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  listProducts,
  createProduct,
  updateProduct,
  uploadProductImage,
  deleteProductImage,
} from "@/features/catalog/catalogApi";
import { Plus, Pencil, Package, X, ImagePlus, Loader2, Star, Tag, CheckCircle2, ChevronDown} from "lucide-react";
import type { Product, CreateProductPayload } from "@/features/catalog/catalogTypes";
import { PRODUCT_CATEGORIES } from "@/features/catalog/catalogTypes";

const NAV = [{ label: "Produtos", href: "/comercial" }];

// ─── Tipos internos ───────────────────────────────────────────────────────────

type UploadedImage = {
  id: string;
  path: string;
  previewUrl: string;
  uploading: boolean;
  error: string;
};

type FormState = {
  nome: string;
  descricao: string;
  preco: number;
  categoria: (typeof PRODUCT_CATEGORIES)[number] | null;
  promocao: boolean;
  ativo: boolean;
};

const EMPTY_FORM: FormState = {
  nome: "",
  descricao: "",
  preco: 0,
  categoria: null,
  promocao: false,
  ativo: true,
};

function makeId() {
  return Math.random().toString(36).slice(2);
}

function extractPath(url: string): string {
  const marker = "/object/public/products_drystore/";
  const idx = url.indexOf(marker);
  return idx >= 0 ? url.slice(idx + marker.length) : url;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Comercial() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [search, setSearch]         = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const [pageError, setPageError]   = useState("");

  const [modalOpen, setModalOpen]           = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading]       = useState(false);
  const [formError, setFormError]           = useState("");
  const [removingImageId, setRemovingImageId] = useState<string | null>(null);

  // ─── Form state ─────────────────────────────────────────────────────────
  const [form, setForm]     = useState<FormState>(EMPTY_FORM);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const fileInputRef        = useRef<HTMLInputElement>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  // Fecha modal com ESC
  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") closeModal(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  async function loadProducts() {
    setIsLoading(true);
    setPageError("");
    try {
      const result = await listProducts({ ativo: undefined });
      setProducts(result.data);
    } catch (err) {
      setPageError("Não foi possível carregar os produtos.");
    } finally {
      setIsLoading(false);
    }
  }

  const filtered = products.filter((p) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return p.nome.toLowerCase().includes(s) || p.descricao.toLowerCase().includes(s);
  });

  // ─── Abrir / fechar modal ────────────────────────────────────────────────

  function openCreate() {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setImages([]);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setFormError("");

    setForm({
      nome:      product.nome,
      descricao: product.descricao,
      preco:     product.preco,
      categoria: product.categoria ?? null,
      promocao:  product.promocao,
      ativo:     product.ativo,
    });

    const list: UploadedImage[] = [];
    if (product.imagem_url) {
      list.push({ id: makeId(), path: extractPath(product.imagem_url), previewUrl: product.imagem_url, uploading: false, error: "" });
    }
    for (const img of product.imagens ?? []) {
      list.push({ id: makeId(), path: extractPath(img.url), previewUrl: img.url, uploading: false, error: "" });
    }
    setImages(list);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setImages([]);
    setFormError("");
    setRemovingImageId(null);
  }

  // ─── Upload de imagens ───────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    const newImages: UploadedImage[] = files.map((file) => ({
      id:         makeId(),
      path:       "",
      previewUrl: URL.createObjectURL(file),
      uploading:  true,
      error:      "",
    }));

    setImages((prev) => [...prev, ...newImages]);

    await Promise.all(
      newImages.map(async (img, i) => {
        try {
          const path = await uploadProductImage(files[i]);
          setImages((prev) => prev.map((p) => p.id === img.id ? { ...p, path, uploading: false } : p));
        } catch (err) {
          setImages((prev) => prev.map((p) => p.id === img.id
            ? { ...p, uploading: false, error: err instanceof Error ? err.message : "Erro no upload" }
            : p
          ));
        }
      })
    );
  }

  async function removeImage(id: string) {
    const target = images.find((img) => img.id === id);
    if (!target) return;

    try {
      setRemovingImageId(id);

      if (target.path) {
        await deleteProductImage(target.path);
      }

      setImages((prev) => prev.filter((img) => img.id !== id));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Não foi possível remover a imagem.");
    } finally {
      setRemovingImageId(null);
    }
  }

  function setCover(id: string) {
    setImages((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.unshift(item);
      return next;
    });
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (anyUploading) return;

    setFormLoading(true);
    setFormError("");

    const ready        = images.filter((i) => i.path && !i.error);
    const [capa, ...extras] = ready;

    const payload: CreateProductPayload = {
      nome:          form.nome,
      descricao:     form.descricao,
      preco:         Number(form.preco),
      imagem_url:    capa?.path ?? null,
      imagens_paths: extras.map((i) => i.path),
      categoria:     form.categoria,
      promocao:      form.promocao,
      ativo:         form.ativo,
    };

    try {
      if (editingProduct) {
        const updated = await updateProduct(editingProduct.id, payload);
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await createProduct(payload);
        setProducts((prev) => [created, ...prev]);
      }
      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar produto.");
    } finally {
      setFormLoading(false);
    }
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const anyUploading = images.some((i) => i.uploading);
  const isDisabled   = formLoading || anyUploading;
  const coverImage   = images[0];

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <DashboardLayout navItems={NAV}>
      <div className="space-y-4 sm:space-y-6">

        {/* Cabeçalho */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Produtos</h1>
          <p className="mt-1 text-sm text-slate-600">Cadastre, edite e gerencie os produtos da loja</p>
        </div>

        {/* Busca + botão */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou descrição..."
            className="w-full max-w-md rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Novo produto
          </button>
        </div>

        {pageError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</div>
        )}

        {/* Lista */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="py-16 text-center text-sm text-slate-500">Carregando produtos...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              {search ? "Nenhum produto encontrado." : "Nenhum produto cadastrado ainda."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((product) => (
                <div key={product.id} className="flex items-center gap-4 px-4 py-3 sm:px-6">
                  {/* Thumbnail */}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-stone-100 flex items-center justify-center">
                    {product.imagem_url
                      ? <img src={product.imagem_url} alt={product.nome} className="h-full w-full object-cover" />
                      : <Package className="h-6 w-6 text-stone-300" />
                    }
                    {(product.imagens?.length ?? 0) > 0 && (
                      <div className="absolute bottom-0 right-0 rounded-tl-lg bg-black/55 px-1 text-[9px] font-bold text-white">
                        +{product.imagens.length + 1}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{product.nome}</p>
                      {product.promocao && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          <Tag className="h-3 w-3" /> Promoção
                        </span>
                      )}
                      {!product.ativo && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400 truncate">{product.descricao}</p>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-sm font-bold" style={{ color: "#b8972a" }}>
                        R$ {product.preco.toFixed(2)}
                      </span>
                      {product.categoria && (
                        <span className="text-xs text-slate-400 capitalize">· {product.categoria}</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEdit(product)}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-right text-xs text-slate-400">
          {filtered.length} produto{filtered.length !== 1 ? "s" : ""} exibido{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── MODAL ─────────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do modal */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                {editingProduct ? "Editar produto" : "Novo produto"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Corpo do modal */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
              )}

              {/* ── SEÇÃO: IMAGENS ───────────────────────────────────────────── */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Imagens do produto</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      A primeira imagem é a capa. Clique em <Star className="inline h-3 w-3 text-amber-500" /> para definir outra como capa.
                    </p>
                  </div>
                </div>

                {/* Preview grande da capa */}
                <div className="mb-4 flex gap-4">
                  <div
                    className="relative h-40 w-40 shrink-0 overflow-hidden rounded-2xl border-2 border-dashed flex items-center justify-center"
                    style={{ borderColor: coverImage?.previewUrl ? "#e2d9cc" : "#cbd5e1", background: coverImage?.previewUrl ? "transparent" : "#f8fafc" }}
                  >
                    {coverImage?.previewUrl ? (
                      <>
                        <img src={coverImage.previewUrl} alt="Capa" className="h-full w-full object-cover" />
                        {coverImage.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-white shadow">
                          <Star className="h-3 w-3" /> Capa
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-300">
                        <ImagePlus className="h-10 w-10" />
                        <span className="text-xs text-slate-400">Sem capa</span>
                      </div>
                    )}
                  </div>

                  {/* Grid de imagens adicionais */}
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2">
                      {images.map((img, idx) => (
                        <div
                          key={img.id}
                          className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                            idx === 0 ? "border-amber-400" : "border-slate-200"
                          }`}
                          style={{ background: "#f8fafc" }}
                        >
                          <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />

                          {/* Spinner */}
                          {img.uploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                              <Loader2 className="h-5 w-5 animate-spin text-white" />
                            </div>
                          )}

                          {/* Erro */}
                          {img.error && (
                            <div className="absolute inset-0 flex items-center justify-center bg-red-500/75 p-1">
                              <span className="text-[9px] text-white text-center leading-tight">{img.error}</span>
                            </div>
                          )}

                          {/* Upload ok */}
                          {!img.uploading && !img.error && img.path && idx !== 0 && (
                            <div className="absolute bottom-1 right-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 drop-shadow" />
                            </div>
                          )}

                          {/* Botões de ação */}
                          {!img.uploading && (
                            <div className="absolute right-1 top-1 flex flex-col gap-1">
                              <button
                                type="button"
                                onClick={() => removeImage(img.id)}
                                title="Remover"
                                disabled={removingImageId === img.id}
                                className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-600 transition disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {removingImageId === img.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <X className="h-3 w-3" />
                                )}
                              </button>
                              {idx !== 0 && img.path && (
                                <button
                                  type="button"
                                  onClick={() => setCover(img.id)}
                                  title="Definir como capa"
                                  className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-amber-500 transition"
                                >
                                  <Star className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Botão adicionar */}
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileChange}
                          disabled={isDisabled}
                          className="hidden"
                          id="comercial-images-input"
                        />
                        <label
                          htmlFor="comercial-images-input"
                          className={`flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-600 ${isDisabled ? "pointer-events-none opacity-50" : ""}`}
                        >
                          <ImagePlus className="h-6 w-6" />
                          <span className="text-[10px] font-medium leading-tight text-center">
                            {anyUploading ? "Enviando" : "Adicionar"}
                          </span>
                        </label>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">JPG, PNG, WEBP — máx. 5 MB por imagem</p>
                  </div>
                </div>
              </section>

              <div className="border-t border-slate-100" />

              {/* ── SEÇÃO: DADOS ─────────────────────────────────────────────── */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800">Dados do produto</h3>

                {/* Nome */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => setField("nome", e.target.value)}
                    required
                    placeholder="Ex: Case Premium iPhone 15"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Descrição <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.descricao}
                    onChange={(e) => setField("descricao", e.target.value)}
                    required
                    rows={3}
                    placeholder="Descreva o produto..."
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  />
                </div>

                {/* Preço + Categoria */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Preço (R$) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.preco}
                      onChange={(e) => setField("preco", parseFloat(e.target.value) || 0)}
                      required
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </div>

                  <div className="relative">
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Categoria
                    </label>

                    <button
                      type="button"
                      onClick={() => setCategoryOpen((o) => !o)}
                      className="w-full flex items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 transition outline-none hover:border-slate-400"
                    >
                      <span>
                        {form.categoria
                          ? form.categoria === "outros"
                            ? "Sem categoria"
                            : form.categoria.charAt(0).toUpperCase() + form.categoria.slice(1)
                          : "Selecionar categoria"}
                      </span>

                      <ChevronDown
                        className="h-4 w-4 transition-transform"
                        style={{
                          transform: categoryOpen ? "rotate(180deg)" : "rotate(0deg)",
                        }}
                      />
                    </button>

                    {categoryOpen && (
                      <div className="absolute left-0 right-0 top-full z-30 max-h-[160px] overflow-y-auto rounded-xl border border-slate-300 bg-white shadow-lg">
                        {PRODUCT_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setField("categoria", cat);
                              setCategoryOpen(false);
                            }}
                            className="w-full px-4 py-3 text-sm text-left transition hover:bg-slate-50"
                          >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Promoção + Ativo */}
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={form.promocao}
                      onChange={(e) => setField("promocao", e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-amber-500"
                    />
                    <span className="text-sm font-medium text-slate-700">Marcar como promoção</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={form.ativo}
                      onChange={(e) => setField("ativo", e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-slate-700"
                    />
                    <span className="text-sm font-medium text-slate-700">Produto ativo (visível no catálogo)</span>
                  </label>
                </div>
              </section>

              {/* ── AÇÕES ────────────────────────────────────────────────────── */}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isDisabled}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isDisabled}
                  className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {formLoading
                    ? "Salvando..."
                    : anyUploading
                    ? "Aguardando uploads..."
                    : editingProduct
                    ? "Salvar alterações"
                    : "Cadastrar produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}