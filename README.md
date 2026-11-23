# Picole — Romaneio para Sorveterias (PWA)

Aplicativo web PWA mobile-first (responsivo para desktop/notebook) para controle de romaneios de carga, conferência de retirada, estoque em caixa e fechamento mútuo de sobras entre **Sorveterias** e **Sorveteiros**.

## Stack
- React 18 + TypeScript + Vite
- Tailwind CSS
- React Router DOM
- Lucide React
- Supabase JS (`@supabase/supabase-js`) com Auth persistente e Realtime
- `vite-plugin-pwa` (Manifest + Service Worker)

## Configuração Local

1. Copie `.env.example` para `.env` (ou edite o `.env` existente) e preencha sua chave pública `anon` do Supabase:
   ```env
   VITE_SUPABASE_URL=https://niqzrwflcttejurfwafs.supabase.co
   VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Build de produção (gera PWA completo em `dist/`):
   ```bash
   npm run build
   ```
