import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  Clock,
  Download,
  FileCheck2,
  Fingerprint,
  LayoutDashboard,
  LogIn,
  MessageCircle,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Snowflake,
  Sparkles,
  Sun,
  Sunset,
  TrendingUp,
  UserPlus,
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

const GANHOS_SORVETERIA = [
  {
    title: 'Fim das filas no balcão',
    desc: 'Separação antecipada enquanto o sorveteiro ainda está a caminho.',
    icon: Clock,
    accent: 'bg-ocean-100 text-ocean-800',
  },
  {
    title: 'Zero erro de conta e zero papel rasurado',
    desc: 'Histórico digital auditável por sorveteiro, marca, sabor e praia.',
    icon: FileCheck2,
    accent: 'bg-emerald-100 text-emerald-800',
  },
  {
    title: 'Economia e precisão no gelo seco',
    desc: 'Sugestão proporcional automática configurável pela própria sorveteria.',
    icon: Snowflake,
    accent: 'bg-sky-100 text-sky-800',
  },
  {
    title: 'Mais giro de estoque',
    desc: 'Possibilidade de sugerir sabores disponíveis na hora de revisar o pedido.',
    icon: TrendingUp,
    accent: 'bg-amber-100 text-amber-800',
  },
]

const GANHOS_SORVETEIRO = [
  {
    title: 'Menos tempo parado na sorveteria, mais tempo vendendo na praia',
    desc: 'A caixa já está separada quando você chega.',
    icon: Sun,
    accent: 'bg-amber-100 text-amber-800',
  },
  {
    title: 'Sem surpresa de sabor em falta no balcão',
    desc: 'Você recebe no celular o que tem disponível e aprova antes de sair.',
    icon: RefreshCw,
    accent: 'bg-sky-100 text-sky-800',
  },
  {
    title: 'Transparência total no acerto do fim do dia',
    desc: 'Conferência item a item nos dois celulares — nada de divergência no fechamento.',
    icon: ShieldCheck,
    accent: 'bg-emerald-100 text-emerald-800',
  },
  {
    title: 'App leve e direto no celular',
    desc: 'Funciona direto na tela inicial do smartphone sem pesar na memória.',
    icon: Smartphone,
    accent: 'bg-ocean-100 text-ocean-800',
  },
]

/** Ilustração vetorial: Caixa térmica preparada com picolés e gelo seco */
function ThermalBoxIllustration() {
  return (
    <svg
      viewBox="0 0 260 118"
      className="h-28 w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="260" height="118" rx="16" fill="#f0f9ff" />
      {/* Névoa fria */}
      <circle cx="88" cy="28" r="14" fill="#bae6fd" opacity="0.55" />
      <circle cx="114" cy="22" r="18" fill="#e0f2fe" opacity="0.85" />
      <circle cx="144" cy="26" r="15" fill="#bae6fd" opacity="0.55" />
      <circle cx="170" cy="30" r="12" fill="#e0f2fe" opacity="0.8" />
      {/* Picolés saindo da caixa */}
      <rect x="86" y="24" width="22" height="36" rx="11" fill="#f59e0b" />
      <rect x="95" y="56" width="4" height="12" rx="2" fill="#fde68a" />
      <rect x="119" y="18" width="22" height="40" rx="11" fill="#10b981" />
      <rect x="128" y="54" width="4" height="14" rx="2" fill="#fde68a" />
      <rect x="152" y="24" width="22" height="36" rx="11" fill="#0284c7" />
      <rect x="161" y="56" width="4" height="12" rx="2" fill="#fde68a" />
      {/* Caixa térmica */}
      <rect x="58" y="54" width="144" height="50" rx="12" fill="#0369a1" />
      <rect x="52" y="48" width="156" height="14" rx="7" fill="#0284c7" />
      <rect x="108" y="68" width="44" height="8" rx="4" fill="#bae6fd" />
      {/* Badge de pronto */}
      <circle cx="204" cy="48" r="14" fill="#059669" />
      <path
        d="M198 48.5L202 52.5L210.5 44"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Ilustração vetorial: Praia ensolarada + carrinho térmico */
function BeachCartIllustration() {
  return (
    <svg
      viewBox="0 0 260 118"
      className="h-28 w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="260" height="118" rx="16" fill="#e0f2fe" />
      {/* Sol */}
      <circle cx="218" cy="28" r="16" fill="#fbbf24" />
      <circle cx="218" cy="28" r="22" fill="#fbbf24" opacity="0.22" />
      {/* Mar e areia */}
      <path d="M0 78C50 70 110 86 170 76C210 70 238 74 260 72V118H0V78Z" fill="#0284c7" opacity="0.25" />
      <path d="M0 90C64 84 140 96 260 88V118H0V90Z" fill="#fde68a" />
      {/* Guarda-sol do carrinho */}
      <path d="M88 42C88 26 112 18 134 18C156 18 180 26 180 42H88Z" fill="#f59e0b" />
      <path d="M114 42C114 28 122 18 134 18C146 18 154 28 154 42H114Z" fill="#0369a1" />
      <rect x="132" y="42" width="4" height="32" fill="#475569" />
      {/* Carrinho térmico */}
      <rect x="92" y="64" width="76" height="30" rx="8" fill="#0369a1" />
      <rect x="90" y="60" width="80" height="8" rx="4" fill="#38bdf8" />
      <path d="M168 68H182L186 58" stroke="#334155" strokeWidth="3.5" strokeLinecap="round" />
      {/* Rodas */}
      <circle cx="110" cy="96" r="9" fill="#0f172a" />
      <circle cx="110" cy="96" r="3.5" fill="#e2e8f0" />
      <circle cx="152" cy="96" r="9" fill="#0f172a" />
      <circle cx="152" cy="96" r="3.5" fill="#e2e8f0" />
    </svg>
  )
}

export function LandingPage() {
  const { user, perfil, sorveteria } = useAuth()
  const { isStandalone, promptInstall } = usePWAInstall()
  const [activeTab, setActiveTab] = useState<'sorveteria' | 'sorveteiro'>('sorveteria')

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

            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
              <Link
                to="/cadastro"
                className="group flex min-h-[76px] items-center justify-between gap-3 rounded-2xl bg-sun-400 px-5 py-4 text-left text-slate-950 shadow-lg transition-all hover:bg-sun-500 active:scale-[0.99]"
              >
                <div className="min-w-0">
                  <span className="flex items-center gap-2 text-lg font-black leading-tight">
                    <Smartphone className="h-5 w-5 shrink-0" />
                    <span>Sou Sorveteiro</span>
                  </span>
                  <span className="mt-1 block text-xs font-bold leading-snug text-slate-900">
                    Quero me cadastrar para retirar picolés na sorveteria
                  </span>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <Link
                to="/agendar-reuniao"
                className="group flex min-h-[76px] items-center justify-between gap-3 rounded-2xl border-2 border-white/80 bg-white px-5 py-4 text-left text-ocean-950 shadow-lg transition-all hover:bg-ocean-50 active:scale-[0.99]"
              >
                <div className="min-w-0">
                  <span className="flex items-center gap-2 text-lg font-black leading-tight">
                    <Building2 className="h-5 w-5 shrink-0 text-ocean-700" />
                    <span>Tenho uma Sorveteria</span>
                  </span>
                  <span className="mt-1 block text-xs font-bold leading-snug text-ocean-800">
                    Quero implantar o sistema na minha sorveteria
                  </span>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-ocean-700 transition-transform group-hover:translate-x-0.5" />
              </Link>
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

      {/* Seção Interativa em Duas Abas: "Sou Sorveteria" vs. "Sou Sorveteiro" */}
      <section className="bg-white py-16 sm:py-20" id="perfis">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-block rounded-full bg-ocean-100 px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-ocean-900">
              Experiência dedicada por perfil
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Veja na prática como cada lado trabalha e ganha
            </h2>
            <p className="mt-2 text-base font-medium text-slate-600">
              Escolha seu perfil abaixo para explorar as telas e os benefícios reais no dia a dia.
            </p>
          </div>

          {/* Seletor de Abas Grande */}
          <div className="mx-auto mt-8 max-w-2xl">
            <div
              role="tablist"
              aria-label="Escolha o perfil"
              className="grid grid-cols-2 gap-3 rounded-2xl border-2 border-slate-200 bg-slate-100 p-2"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'sorveteria'}
                onClick={() => setActiveTab('sorveteria')}
                className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl px-4 py-3 text-center transition-all sm:flex-row sm:gap-3 ${
                  activeTab === 'sorveteria'
                    ? 'bg-ocean-700 text-white shadow-md'
                    : 'bg-transparent text-slate-700 hover:bg-white/70 hover:text-slate-950'
                }`}
              >
                <Building2 className="h-6 w-6 shrink-0" />
                <div className="text-center sm:text-left">
                  <span className="block text-base font-black leading-tight sm:text-lg">
                    Sou Sorveteria
                  </span>
                  <span
                    className={`hidden text-xs font-semibold sm:block ${
                      activeTab === 'sorveteria' ? 'text-ocean-100' : 'text-slate-500'
                    }`}
                  >
                    Gestor e equipe de separação
                  </span>
                </div>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'sorveteiro'}
                onClick={() => setActiveTab('sorveteiro')}
                className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-xl px-4 py-3 text-center transition-all sm:flex-row sm:gap-3 ${
                  activeTab === 'sorveteiro'
                    ? 'bg-emerald-700 text-white shadow-md'
                    : 'bg-transparent text-slate-700 hover:bg-white/70 hover:text-slate-950'
                }`}
              >
                <Smartphone className="h-6 w-6 shrink-0" />
                <div className="text-center sm:text-left">
                  <span className="block text-base font-black leading-tight sm:text-lg">
                    Sou Sorveteiro
                  </span>
                  <span
                    className={`hidden text-xs font-semibold sm:block ${
                      activeTab === 'sorveteiro' ? 'text-emerald-100' : 'text-slate-500'
                    }`}
                  >
                    Vendedor autônomo na praia
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Conteúdo Dinâmico da Aba Selecionada */}
          <div key={activeTab} className="mt-10 space-y-12 transition-opacity duration-300">
            {activeTab === 'sorveteria' ? (
              <>
                {/* BLOCO A — Fluxo na Prática (Sorveteria) */}
                <div>
                  <h3 className="mb-5 text-center text-xl font-black text-slate-950 sm:text-2xl">
                    Como funciona na prática para a Sorveteria
                  </h3>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Card 1: Recebimento e Ajuste Remoto */}
                    <div className="card flex flex-col justify-between p-5">
                      <div>
                        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="font-extrabold text-ocean-900">Avaliação de Estoque</span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-0.5 font-extrabold text-sky-900">
                              <Snowflake className="h-3 w-3" /> 1,20 kg
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 shadow-sm">
                              <span className="font-bold text-slate-900">1.1 Pistache</span>
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-extrabold text-amber-900">
                                15 → 10
                              </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 shadow-sm">
                              <span className="font-bold text-slate-900">1.2 Ninho Nutella</span>
                              <span className="inline-flex items-center gap-0.5 rounded bg-sky-100 px-1.5 py-0.5 font-extrabold text-sky-900">
                                <Plus className="h-3 w-3" />5 sugerido
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className="inline-block rounded-full bg-ocean-100 px-2.5 py-0.5 text-xs font-extrabold text-ocean-900">
                          Passo 1
                        </span>
                        <h4 className="mt-2 text-lg font-black text-slate-950">
                          Recebimento e Ajuste Remoto
                        </h4>
                        <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-600">
                          Receba o pedido na ordem exata da câmara fria, sinalize sabores em falta ou
                          sugira acréscimos <code className="font-bold">[+]</code> com cálculo
                          automático de gelo seco (kg/g) antes do carrinho chegar.
                        </p>
                      </div>
                    </div>

                    {/* Card 2: Separação Antecipada Sem Fila */}
                    <div className="card flex flex-col justify-between p-5">
                      <div>
                        <div className="mb-4 overflow-hidden rounded-2xl border border-sky-100">
                          <ThermalBoxIllustration />
                        </div>

                        <span className="inline-block rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-extrabold text-indigo-900">
                          Passo 2
                        </span>
                        <h4 className="mt-2 text-lg font-black text-slate-950">
                          Separação Antecipada Sem Fila
                        </h4>
                        <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-600">
                          Com o pedido aprovado remotamente, sua equipe já prepara a caixa térmica
                          antes da chegada do sorveteiro, acabando com os gargalos no pico da manhã.
                        </p>
                      </div>
                    </div>

                    {/* Card 3: Conferência Presencial Dupla */}
                    <div className="card flex flex-col justify-between p-5">
                      <div>
                        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                          <div className="mb-2 flex items-center justify-between font-extrabold">
                            <span className="text-slate-700">Conferência em Tempo Real</span>
                            <span className="text-emerald-700">2/2 OK</span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between rounded-lg bg-emerald-50/80 px-2.5 py-1.5">
                              <span className="font-bold text-slate-900">6.8 Açaí (50 → 8 sob)</span>
                              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600 text-white">
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                              </span>
                            </div>
                            <div className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-center font-extrabold text-white">
                              Retirado 120 − Devolvido 18 ={' '}
                              <span className="text-emerald-400">102 Vendidos</span>
                            </div>
                          </div>
                        </div>

                        <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-900">
                          Passo 3
                        </span>
                        <h4 className="mt-2 text-lg font-black text-slate-950">
                          Conferência Presencial Dupla
                        </h4>
                        <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-600">
                          Checkboxes sincronizados em tempo real na entrega da carga e no retorno das
                          sobras, calculando <strong>Retirado − Devolvido = Vendido</strong> sem
                          divergência.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOCO B — Como a Sorveteria Ganha */}
                <div className="rounded-3xl border-2 border-ocean-200 bg-ocean-50/50 p-6 sm:p-8">
                  <div className="mb-6 text-center">
                    <h3 className="text-2xl font-black text-slate-950 sm:text-3xl">
                      Como a Sorveteria Ganha
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {GANHOS_SORVETERIA.map((g) => {
                      const Icon = g.icon
                      return (
                        <div key={g.title} className="card flex items-start gap-4 p-5">
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${g.accent}`}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="text-base font-extrabold text-slate-950">{g.title}</h4>
                            <p className="mt-1 text-sm font-medium text-slate-600">{g.desc}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Link
                      to="/agendar-reuniao"
                      className="btn-primary min-h-[54px] w-full rounded-2xl px-7 text-base shadow-md sm:w-auto"
                    >
                      <Calendar className="h-5 w-5" />
                      <span>Quero implantar na minha Sorveteria</span>
                      <ArrowRight className="h-5 w-5" />
                    </Link>

                    <a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-whatsapp min-h-[54px] w-full rounded-2xl px-6 text-base shadow-md sm:w-auto"
                    >
                      <MessageCircle className="h-5 w-5" />
                      <span>Falar no WhatsApp Comercial</span>
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* BLOCO A — Fluxo na Prática (Sorveteiro) */}
                <div>
                  <h3 className="mb-5 text-center text-xl font-black text-slate-950 sm:text-2xl">
                    Como funciona na prática para o Sorveteiro
                  </h3>

                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Card 1: Pedido pelo Celular Antes de Sair de Casa */}
                    <div className="card flex flex-col justify-between p-5">
                      <div>
                        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="font-extrabold text-slate-900">Disponibilidade</span>
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 font-extrabold text-sky-900">
                              Aguardando aceite
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="rounded-lg bg-amber-50 px-2.5 py-1.5">
                              <span className="block font-bold text-slate-900">1.1 Pistache</span>
                              <span className="text-[11px] font-extrabold text-amber-900">
                                Provavelmente o sabor acabou
                              </span>
                            </div>
                            <div className="rounded-lg bg-sky-50 px-2.5 py-1.5">
                              <span className="block font-bold text-slate-900">
                                1.2 Ninho Nutella
                              </span>
                              <span className="text-[11px] font-extrabold text-sky-900">
                                Sorveteria sugeriu +5 unid.
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className="inline-block rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-extrabold text-sky-900">
                          Passo 1
                        </span>
                        <h4 className="mt-2 text-lg font-black text-slate-950">
                          Pedido pelo Celular Antes de Sair de Casa
                        </h4>
                        <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-600">
                          Monte sua lista ordenada de sabores e receba aviso imediato caso algum
                          sabor tenha acabado ou sido sugerido pela sorveteria — sem perder viagem.
                        </p>
                      </div>
                    </div>

                    {/* Card 2: Retirada Rápida e Controle na Praia */}
                    <div className="card flex flex-col justify-between p-5">
                      <div>
                        <div className="mb-3 overflow-hidden rounded-2xl border border-sky-100">
                          <BeachCartIllustration />
                        </div>
                        <div className="mb-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
                          <span className="inline-flex items-center gap-1.5 font-extrabold text-emerald-900">
                            <Fingerprint className="h-4 w-4" /> Boas vendas!
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-black text-slate-900">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 bg-white">
                              <Minus className="h-3.5 w-3.5" />
                            </span>
                            <span>14</span>
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ocean-700 text-white">
                              <Plus className="h-3.5 w-3.5" />
                            </span>
                          </span>
                        </div>

                        <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-900">
                          Passo 2
                        </span>
                        <h4 className="mt-2 text-lg font-black text-slate-950">
                          Retirada Rápida e Controle na Praia
                        </h4>
                        <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-600">
                          Libere a saída rapidamente com senha ou biometria e use o botão{' '}
                          <code className="font-bold">[-]</code> para abater cada venda feita na
                          areia com facilidade.
                        </p>
                      </div>
                    </div>

                    {/* Card 3: Fechamento Transparente na Volta */}
                    <div className="card flex flex-col justify-between p-5">
                      <div>
                        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                          <div className="mb-2 rounded-lg bg-red-600 px-2.5 py-1.5 text-center text-[11px] font-black text-white">
                            Sobras confirmadas — não venda mais
                          </div>
                          <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-1.5">
                            <span className="font-bold text-slate-900">Conferência lado a lado</span>
                            <span className="inline-flex items-center gap-1 font-extrabold text-emerald-800">
                              <Check className="h-3.5 w-3.5 stroke-[3]" /> Ambos OK
                            </span>
                          </div>
                        </div>

                        <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-900">
                          Passo 3
                        </span>
                        <h4 className="mt-2 text-lg font-black text-slate-950">
                          Fechamento Transparente na Volta
                        </h4>
                        <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-600">
                          Tela de sobras com trava de segurança e conferência lado a lado com a
                          sorveteria, garantindo conta exata sem papel molhado ou rasurado.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOCO B — Como o Sorveteiro Ganha */}
                <div className="rounded-3xl border-2 border-emerald-200 bg-emerald-50/50 p-6 sm:p-8">
                  <div className="mb-6 text-center">
                    <h3 className="text-2xl font-black text-slate-950 sm:text-3xl">
                      Como o Sorveteiro Ganha
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {GANHOS_SORVETEIRO.map((g) => {
                      const Icon = g.icon
                      return (
                        <div key={g.title} className="card flex items-start gap-4 p-5">
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${g.accent}`}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="text-base font-extrabold text-slate-950">{g.title}</h4>
                            <p className="mt-1 text-sm font-medium text-slate-600">{g.desc}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-7 flex flex-col items-center gap-3 text-center">
                    <Link
                      to="/cadastro"
                      className="btn-success min-h-[54px] w-full rounded-2xl px-7 text-base shadow-md sm:w-auto"
                    >
                      <UserPlus className="h-5 w-5" />
                      <span>Já trabalho com uma sorveteria parceira — Criar minha conta</span>
                    </Link>

                    <Link
                      to="/agendar-reuniao"
                      className="text-sm font-bold text-ocean-800 underline underline-offset-4 hover:text-ocean-950"
                    >
                      Indicar minha sorveteria para usar o sistema
                    </Link>
                  </div>
                </div>
              </>
            )}
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
            <Link to="/cadastro" className="hover:text-white">
              Cadastro de Sorveteiro
            </Link>
          </div>
        </div>
      </footer>

      {/* Modal de instruções PWA (iOS / fallback) */}
      <InstallPWABanner variant="modal-only" />
    </div>
  )
}
