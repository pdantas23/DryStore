-- ================================================================
-- DRY STORE — Tabela de imagens adicionais por produto
-- Execute no Supabase: SQL Editor → New query → Run
-- ================================================================

CREATE TABLE IF NOT EXISTS public.produtos_imagens_drystore (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id uuid        NOT NULL REFERENCES public.produtos_drystore(id) ON DELETE CASCADE,
  path       text        NOT NULL,   -- path no bucket products_drystore
  ordem      integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_produto_imagens_produto_id
  ON public.produtos_imagens_drystore (produto_id, ordem);

-- RLS
ALTER TABLE public.produtos_imagens_drystore ENABLE ROW LEVEL SECURITY;

-- Leitura pública
DROP POLICY IF EXISTS "imagens_extra_leitura_publica" ON public.produtos_imagens_drystore;
CREATE POLICY "imagens_extra_leitura_publica"
  ON public.produtos_imagens_drystore FOR SELECT
  USING (true);

-- Insert/Update/Delete: apenas admin e comercial
DROP POLICY IF EXISTS "imagens_extra_comercial" ON public.produtos_imagens_drystore;
CREATE POLICY "imagens_extra_comercial"
  ON public.produtos_imagens_drystore FOR ALL
  USING (
    (SELECT role FROM public.profiles_drystore WHERE id = auth.uid())
    IN ('admin', 'comercial')
  );