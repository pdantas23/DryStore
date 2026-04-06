# Dry Store

Stack: **Vite + React 19 + TypeScript + Tailwind 4 + Express + Supabase**

---

## 1. Requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | 20.x ou superior |
| npm | 10.x |
| Conta Supabase | [supabase.com](https://supabase.com) — plano gratuito funciona |

---

## 2. Abrir o projeto

```bash
unzip dry_store.zip
cd dry_store
```

---

## 3. Instalar dependências

```bash
npm install
```

---

## 4. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha o `.env` com os dados do seu projeto Supabase:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key

SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key

CORS_ORIGIN=http://localhost:3000

VITE_WHATSAPP_NUMBER=5511999999999
VITE_WHATSAPP_MESSAGE=Olá! Gostaria de um atendimento.
```

**Onde encontrar as chaves:** `Project Settings → API`

---

## 5. Criar as tabelas no Supabase

Execute as migrations na ordem abaixo. Acesse seu projeto → **SQL Editor → New query**, cole e execute cada arquivo.

### Migration 1 — `supabase/migrations/001_drystore.sql`

Cria:
- Tabela `profiles_drystore` (vinculada ao `auth.users`)
- Tabela `produtos_drystore`
- Trigger `updated_at` em ambas as tabelas
- Trigger de criação automática de perfil ao registrar usuário
- Todas as políticas RLS
- Índices de performance
- Dados de exemplo em `produtos_drystore`

### Migration 2 — `supabase/migrations/002_produto_imagens.sql`

Cria:
- Tabela `produtos_imagens_drystore` (imagens adicionais por produto)
- FK com `ON DELETE CASCADE` para `produtos_drystore`
- Índice por `produto_id` e `ordem`
- Políticas RLS de leitura pública e escrita para `admin`/`comercial`

---

## 6. Criar o bucket de imagens

1. No Supabase → **Storage → New bucket**
2. Nome: **`products_drystore`**
3. Marque **Public bucket** ✅
4. Clique em **Save**

---

## 7. Configurar roles dos usuários

Após criar os usuários no painel **Authentication → Users**, defina as roles:

```sql
UPDATE public.profiles_drystore SET role = 'admin'     WHERE email = 'admin@exemplo.com';
UPDATE public.profiles_drystore SET role = 'comercial' WHERE email = 'comercial@exemplo.com';
```

Roles disponíveis: `admin`, `comercial`

---

## 8. Rodar o projeto

```bash
# Frontend + Backend juntos (recomendado)
npm run dev

# Separados
npm run dev:client   # http://localhost:3000
npm run dev:server   # http://localhost:3001
```

---

## 9. Testar o cadastro de produtos

1. Login com role `comercial` ou `admin`
2. Acesse `/comercial`
3. Clique em **Novo produto**
4. Preencha nome, descrição e preço
5. Clique em **Adicionar imagens** → selecione um ou mais arquivos (JPG/PNG/WEBP, máx 5 MB cada)
   - Preview aparece imediatamente para cada imagem
   - Upload vai para o bucket `products_drystore` em paralelo
   - A primeira imagem é a **capa** — badge "Capa" aparece no thumbnail
   - Clique na estrela em qualquer imagem para torná-la a capa
   - Clique no X para remover uma imagem
6. Clique em **Cadastrar produto**

**Para editar:** clique no botão **Editar** ao lado do produto. As imagens já salvas aparecem no grid e podem ser reordenadas ou substituídas.

---

## 10. Testar promoções no carrossel

1. Edite um produto e marque **Marcar como promoção**
2. Salve
3. Acesse `/` — o produto aparece no carrossel com destaque âmbar
4. Acesse `/catalogo` — o produto aparece com badge "Promoção"

---

## 11. Testar o modal do catálogo

1. Acesse `/catalogo`
2. Clique em qualquer card de produto
3. O modal abre com a imagem principal em destaque
4. Se o produto tiver mais de uma imagem:
   - Thumbnails aparecem abaixo da imagem principal
   - Botões `‹` `›` navegam entre as imagens (aparecem no hover)
   - Contador `1 / N` aparece sobre a imagem
   - Teclas `←` `→` navegam, `ESC` fecha
5. Cards com múltiplas imagens exibem um badge `+N` no canto superior direito

---

## 12. Controle de acesso

| Rota | Acesso |
|---|---|
| `/` | Público |
| `/catalogo` | Público |
| `/login` | Público |
| `/comercial` | Apenas `admin` e `comercial` |

| Cenário | Resultado |
|---|---|
| `/comercial` sem login | Redireciona para `/login` |
| `/comercial` com role inválida | Redireciona para `/` |
| `/comercial` com role `comercial` | ✅ Acesso liberado |
| `POST /api/products` sem auth | `401` |
| `POST /api/products/upload-image` sem auth | `401` |

---

## 13. Estrutura do projeto

```
├── client/src/
│   ├── features/
│   │   ├── auth/               ← Autenticação
│   │   ├── comercial/
│   │   │   └── pages/
│   │   │       └── Comercial.tsx       ← Gestão de produtos
│   │   └── catalog/
│   │       ├── catalogApi.ts
│   │       ├── catalogTypes.ts
│   │       ├── components/
│   │       │   └── ProductForm.tsx     ← Upload de múltiplas imagens
│   │       └── pages/
│   │           └── Catalog.tsx         ← Catálogo com busca e modal
│   └── pages/
│       └── Home.tsx                    ← Carrossel dinâmico de promoções
│
├── server/
│   └── features/
│       └── catalog/
│           ├── catalogTypes.ts
│           ├── catalogService.ts       ← Storage + produtos_drystore + produtos_imagens_drystore
│           └── catalogRoutes.ts        ← Endpoints + multer upload
│
└── supabase/
    └── migrations/
        ├── 001_drystore.sql            ← Execute primeiro
        └── 002_produto_imagens.sql     ← Execute segundo
```

---

## 14. Fluxo do upload de imagens

```
Usuário seleciona um ou mais arquivos
  → Preview local imediato para cada imagem
  → POST /api/products/upload-image  (autenticado, um por arquivo)
  → Servidor: multer recebe em memória
  → Supabase Storage: bucket "products_drystore"
  → Retorna: path = "produtos/timestamp-abc.jpg"
  → Formulário acumula os paths
  → Submit: POST/PATCH /api/products
      → imagem_url  = path da primeira imagem (capa)
      → imagens_paths = paths das demais imagens
  → Service salva capa em produtos_drystore.imagem_url
  → Service salva extras em produtos_imagens_drystore (com ordem)
  → GET /api/products monta URLs públicas dinamicamente
  → Catálogo e Home exibem as imagens
```

---

## 15. Tabelas no Supabase

| Tabela | Descrição |
|---|---|
| `profiles_drystore` | Perfis dos usuários com role |
| `produtos_drystore` | Produtos da loja (inclui imagem de capa) |
| `produtos_imagens_drystore` | Imagens adicionais por produto (com ordem) |

| Bucket | Tipo | Descrição |
|---|---|---|
| `products_drystore` | Público | Todas as imagens dos produtos |