import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Download,
  LayoutDashboard,
  LogIn,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Snowflake,
  Sparkles,
  Sun,
  Sunset,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePWAInstall } from '../contexts/PWAInstallContext'
import { getHomePathForRole } from '../components/ProtectedRoute'
import { InstallPWABanner } from '../components/InstallPWABanner'

const WHATSAPP_URL =
  'https://wa.me/5511953423954?text=Ol%C3%A1!%20Quero%20conhecer%20o%20sistema%20Picol%C3%A9%20na%20Praia%20para%20minha%20sorveteria.'

const FLUXO_INICIO = [
  {
    step: '1',
    title: 'Pedido pelo celular na ordem da câmara fria',
    desc: 'O sorveteiro escolhe a marca e informa as quantidades na ordem exata de separação da sorveteria.',
  },
  {
    step: '2',
    title: 'Ajuste de estoque e sugestão de gelo seco',
    desc: 'A sorveteria sinaliza sabores em falta ou sugere novidades antes mesmo do sorveteiro chegar, com cálculo automático da proporção de gelo seco (kg/g).',
  },
  {
    step: '3',
    title: 'Separação antecipada',
    desc: 'Com a lista aprovada à distância pelo sorveteiro, a sorveteria já deixa a caixa pronta, eliminando filas na saída para a praia.',
  },
  {
    step: '4',
    title: 'Conferência presencial com checkboxes + senha',
    desc: 'Na retirada, ambos conferem sabor por sabor in loco e o sorveteiro libera a saída com senha ou biometria ("Boas vendas!").',
  },
]

const FLUXO_ENCERRAMENTO = [
  {
    step: '1',
    title: 'Baixa de vendas durante o dia',
    desc: 'Na areia, o sorveteiro abate cada venda com um toque no [-] e acompanha o que resta na caixa.',
  },
  {
    step: '2',
    title: 'Registro de sobras',
    desc: 'Ao encerrar o turno, confirma a lista de sobras e trava novas vendas ("Sobras confirmadas, não venda mais nenhum sorvete").',
  },
  {
    step: '3',
    title: 'Conferência presencial item a item',
    desc: 'De volta à sorveteria, ambos marcam os checkboxes de cada sabor devolvido lado a lado, com sincronização em tempo real.',
  },
  {
    step: '4',
    title: 'Fechamento duplo sem divergência',
    desc: 'O sistema calcula automaticamente Retirado − Devolvido = Vendido e só finaliza a jornada após o OK nos dois celulares.',
  },
]

const BENEFICIOS_SORVETERIA = [
  'Menos fila na saída da manhã com separação antecipada',
  'Zero erro de conta ou rasura no balcão',
  'Catálogo ordenado numericamente por linha e sabor',
  'Cálculo configurável de gelo seco (kg e gramas)',
  'Histórico auditável por sorveteiro e praia de atuação',
]

const BENEFICIOS_SORVETEIRO = [
  'App leve instalável direto na tela inicial do celular',
  'Sabe antes de sair de casa quais sabores estão disponíveis',
  'Controle rápido do estoque na caixa sob luz do sol',
  'Conferência justa e transparente no fechamento do dia',
  'Sessão persistente e confirmação com senha ou biometria',
]

export function LandingPage() {
  const { user, perfil, sorveteria } = useAuth()
  const { isStandalone, promptInstall } = usePWAInstall()

  const isAuthenticated = Boolean(user && perfil)
  const panelPath =
    perfil &&
    (perfil.role === 'superadmin' ||
      (perfil.status_aprovacao === 'aprovado' && sorveteria?.ativo !== false))
      ? getHomePathForRole(perfil.role)
      : '/aguardando-aprovacao'

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header Fixo */}
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-ocean-700 to-ocean-900 text-sun-400 shadow-sm">
              <Snowflake className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-black leading-tight text-slate-950 sm:text-lg">
                Picolé na Praia
              </p>
              <p className="truncate text-[11px] font-semibold text-slate-500 sm:text-xs">
                Sistema de romaneio para sorveterias
              </p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            {!isStandalone && (
              <button
                type="button"
                onClick={promptInstall}
                className="hidden min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-ocean-800 transition-colors hover:bg-ocean-50 sm:inline-flex"
              >
                <Download className="h-4 w-4" />
                <span>Baixar App</span>
              </button>
            )}

            {isAuthenticated ? (
              <Link
                to={panelPath}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border-2 border-ocean-200 bg-ocean-50 px-3.5 text-sm font-extrabold text-ocean-900 transition-colors hover:bg-ocean-100"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Ir para meu Painel</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-3.5 text-sm font-extrabold text-slate-900 transition-colors hover:bg-slate-50"
              >
                <LogIn className="h-4 w-4 text-ocean-700" />
                <span>Entrar</span>
              </Link>
            )}

            <Link
              to="/agendar-reuniao"
              className="hidden min-h-[44px] items-center gap-1.5 rounded-xl bg-ocean-700 px-4 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-ocean-800 md:inline-flex"
            >
              <Calendar className="h-4 w-4" />
              <span>Agendar Reunião</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-ocean-900 via-ocean-800 to-ocean-700 pb-16 pt-12 text-white sm:pb-20 sm:pt-16">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 lg:grid-cols-12">
          {/* Left Copy */}
          <div className="space-y-6 lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-sun-400/40 bg-sun-400/15 px-4 py-1.5 text-xs font-extrabold tracking-wide text-sun-100 sm:text-sm">
              <Sparkles className="h-4 w-4 shrink-0 text-sun-400" />
              <span>Chega de papel molhado, rasura e fila no balcão</span>
            </div>

            <h1 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              O romaneio digital entre a sorveteria e o carrinho na praia.
            </h1>

            <p className="max-w-2xl text-base font-medium leading-relaxed text-ocean-100 sm:text-lg">
              Controle exato da carga retirada, sugestão automática de gelo seco e conferência dupla
              nas sobras — do pedido à distância até o fechamento do dia.
            </p>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap">
              <Link
                to="/agendar-reuniao"
                className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-sun-400 px-6 py-3.5 text-base font-black text-slate-950 shadow-lg transition-colors hover:bg-sun-500"
              >
                <Calendar className="h-5 w-5" />
                <span>Solicitar Reunião de Implantação</span>
                <ArrowRight className="h-5 w-5" />
              </Link>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border-2 border-white/30 bg-white/10 px-6 py-3.5 text-base font-extrabold text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                <MessageCircle className="h-5 w-5 text-emerald-300" />
                <span>Falar no WhatsApp</span>
              </a>
            </div>

            {!isStandalone && (
              <div className="pt-1 sm:hidden">
                <button
                  type="button"
                  onClick={promptInstall}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-ocean-100 underline underline-offset-4"
                >
                  <Download className="h-4 w-4" />
                  <span>Baixar App no celular</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Illustrative Mockup Card */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-white/20 bg-white p-5 text-slate-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="font-mono text-xs font-extrabold text-ocean-800">#RM-482</span>
                  <h2 className="text-base font-black text-slate-950">
                    Resumo em Tempo Real — Praia Grande
                  </h2>
                </div>
                <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold uppercase text-emerald-900">
                  Conferido
                </span>
              </div>

              {/* 3 KPIs */}
              <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
                <div className="rounded-2xl bg-slate-100 p-3">
                  <p className="text-[11px] font-extrabold uppercase text-slate-500">Retirado</p>
                  <p className="mt-0.5 text-2xl font-black text-slate-950">120</p>
                </div>
                <div className="rounded-2xl border border-purple-200 bg-purple-50 p-3">
                  <p className="text-[11px] font-extrabold uppercase text-purple-800">Sobras</p>
                  <p className="mt-0.5 text-2xl font-black text-purple-950">18</p>
                </div>
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3">
                  <p className="text-[11px] font-extrabold uppercase text-emerald-800">Vendido</p>
                  <p className="mt-0.5 text-2xl font-black text-emerald-950">102</p>
                </div>
              </div>

              {/* Dry Ice Badge */}
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-2.5 text-xs font-extrabold text-sky-950">
                <Snowflake className="h-4 w-4 shrink-0 text-sky-700" />
                <span>Sugestão de Gelo Seco: 1,20 kg (base: 1 kg / 100 picolés)</span>
              </div>

              {/* Ordered Flavors Preview */}
              <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 text-xs">
                {[
                  { label: '1.1 Pistache', ret: 30, sob: 4, vend: 26 },
                  { label: '1.2 Ninho Nutella', ret: 40, sob: 6, vend: 34 },
                  { label: '6.8 Açaí', ret: 50, sob: 8, vend: 42 },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-3 py-2.5">
                    <span className="font-extrabold text-slate-900">{row.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-500">Ret: {row.ret}</span>
                      <span className="font-bold text-purple-800">Sob: {row.sob}</span>
                      <span className="font-black text-emerald-700">Vend: {row.vend}</span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Dupla confirmação (Sorveteria + Sorveteiro)
                </span>
                <span className="text-emerald-400">100% OK</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seção: Como Funciona — Dois Fluxos Simples e Seguros */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full bg-ocean-100 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-ocean-900">
              Operação ponta a ponta
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Como Funciona: Dois Fluxos Simples e Seguros
            </h2>
            <p className="mt-3 text-base font-medium text-slate-600">
              Separação clara entre o acordo remoto do pedido e a conferência presencial na retirada
              e devolução da caixa.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Bloco 1 — Início de Jornada */}
            <div className="rounded-3xl border-2 border-ocean-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ocean-700 text-white">
                  <Sun className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-ocean-700">
                    Bloco 1 · Início de Jornada
                  </span>
                  <h3 className="text-xl font-black text-slate-950">
                    Acordo Remoto + Retirada Sem Fila
                  </h3>
                </div>
              </div>

              <ol className="mt-6 space-y-4">
                {FLUXO_INICIO.map((item) => (
                  <li
                    key={item.step}
                    className="flex items-start gap-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ocean-700 text-sm font-black text-white">
                      {item.step}
                    </span>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-950">{item.title}</h4>
                      <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
                        {item.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Bloco 2 — Encerramento de Jornada */}
            <div className="rounded-3xl border-2 border-amber-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-slate-950">
                  <Sunset className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700">
                    Bloco 2 · Encerramento de Jornada
                  </span>
                  <h3 className="text-xl font-black text-slate-950">
                    Controle na Praia + Acerto Blindado
                  </h3>
                </div>
              </div>

              <ol className="mt-6 space-y-4">
                {FLUXO_ENCERRAMENTO.map((item) => (
                  <li
                    key={item.step}
                    className="flex items-start gap-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-sm font-black text-slate-950">
                      {item.step}
                    </span>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-950">{item.title}</h4>
                      <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
                        {item.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Benefícios por Perfil */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Feito para quem gerencia e para quem vende na areia
            </h2>
            <p className="mt-3 text-base font-medium text-slate-600">
              Cada perfil tem uma interface dedicada, com botões grandes e alto contraste para o dia
              a dia sob o sol.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Para a Sorveteria */}
            <div className="rounded-3xl border-2 border-slate-200 bg-slate-50 p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ocean-100 text-ocean-800">
                  <Building2 className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-black text-slate-950">Para a Sorveteria</h3>
              </div>
              <ul className="mt-6 space-y-3">
                {BENEFICIOS_SORVETERIA.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm font-bold text-slate-800 sm:text-base">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ocean-700" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Para o Sorveteiro */}
            <div className="rounded-3xl border-2 border-slate-200 bg-slate-50 p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-black text-slate-950">Para o Sorveteiro</h3>
              </div>
              <ul className="mt-6 space-y-3">
                {BENEFICIOS_SORVETEIRO.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm font-bold text-slate-800 sm:text-base">
                    <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-slate-950 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
            Leve o Picolé na Praia para sua sorveteria nesta temporada
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base font-medium text-slate-300">
            Agende uma demonstração rápida de 15 minutos e veja como configurar seu catálogo,
            proporção de gelo seco e equipe de sorveteiros no mesmo dia.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/agendar-reuniao"
              className="inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-sun-400 px-7 py-3.5 text-base font-black text-slate-950 shadow-lg transition-colors hover:bg-sun-500 sm:w-auto"
            >
              <Calendar className="h-5 w-5" />
              <span>Solicitar Reunião de Implantação</span>
            </Link>

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp min-h-[54px] w-full rounded-2xl px-7 sm:w-auto"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Falar no WhatsApp</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs font-semibold text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 sm:flex-row">
          <p>© {new Date().getFullYear()} Picolé na Praia — Sistema de romaneio para sorveterias.</p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-white">
              Acessar sistema
            </Link>
            <Link to="/cadastro-sorveteiro" className="hover:text-white">
              Cadastro de Sorveteiro
            </Link>
          </div>
        </div>
      </footer>

      {/* Botão Flutuante de WhatsApp */}
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar no WhatsApp"
        title="Falar no WhatsApp"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#16a34a] text-white shadow-xl transition-transform hover:scale-105 hover:bg-[#15803d] active:scale-95"
      >
        <MessageCircle className="h-7 w-7" />
      </a>

      {/* Modal de instruções PWA (iOS / fallback) */}
      <InstallPWABanner variant="modal-only" />
    </div>
  )
}
