# Infinity — Sistema financeiro e RH para clínicas

Aplicação single-page em React (via Babel in-browser) + Supabase.
Visual **monocromático** (branco, cinza e preto) com superfícies de **vidro**.

## Estrutura

- `index.html` — design system (tokens CSS) + **configuração do Supabase** (`window.INFINITY_CONFIG`)
- `src/supabase.jsx` — cliente REST e wrappers CRUD
- `src/data.jsx` — lógica de dados + importação de Excel
- `src/ui.jsx` — primitivos (botões, cartões de vidro, ícones)
- `src/charts.jsx` — gráficos
- `src/widgets.jsx` — dashboard (KPIs, fluxo, previsto×realizado, listas)
- `src/pages.jsx` — Contas, Impostos, Compras, Agenda, Config
- `src/auth.jsx` — login, Perfil, Equipe
- `src/rh.jsx` + `src/salas.jsx` — módulo RH e Salas
- `src/app.jsx` — shell (sidebar, topbar, roteador)
- `supabase/setup_novo_banco/` — **scripts para criar o banco do zero**

## Conectar a um banco Supabase novo

1. Crie o projeto em [supabase.com](https://supabase.com).
2. **SQL Editor** → cole e rode `supabase/setup_novo_banco/1_schema_completo.sql`.
3. Abra o app, crie sua conta na tela de login (Cadastrar).
4. **SQL Editor** → ajuste e-mail/nome da empresa em `2_empresa_e_admin.sql` e rode.
5. (Opcional) Cadastre os colaboradores no RH e rode `3_opcional_escalas_equilibrium.sql`.
6. No `index.html`, troque `SUPABASE_URL` e `SUPABASE_ANON_KEY` em `window.INFINITY_CONFIG`
   (valores em **Settings → API** do projeto).
7. Em **Authentication → URL Configuration** do Supabase:
   - `Site URL`: a URL pública do site
   - `Redirect URLs`: a mesma URL com `/**` no final

## Publicar no GitHub Pages

O deploy está automatizado em `.github/workflows/deploy.yml` (site estático, sem build):
qualquer push na branch `main` publica o site. Alternativamente, em
**Settings → Pages** aponte a fonte para a branch `main`, pasta `/ (root)`.

## Desenvolvimento local

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Tema

Os tons da interface ficam nos tokens CSS do `index.html` (`--g-0` a `--g-9`,
`--accent`, `--c-pos`, `--c-neg`). Para reativar cores semânticas suaves
(verde/vermelho dessaturados em pago/pendente), troque `<body data-theme="light">`
por `<body data-theme="light" data-semantic="soft">`.
