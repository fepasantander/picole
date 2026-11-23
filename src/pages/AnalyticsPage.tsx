import { AlertTriangle, Award, BarChart3, Package, TrendingUp } from 'lucide-react'
import { Layout } from '../components/Layout'

export function AnalyticsPage() {
  const placeholders = [
    {
      title: 'Total de Picolés Retirados',
      desc: 'Volume consolidado de cargas retiradas por período, marca e praia.',
      icon: Package,
      accent: 'bg-sky-100 text-sky-800',
    },
    {
      title: 'Total de Picolés Vendidos',
      desc: 'Evolução diária e semanal das vendas efetivas (Retirado - Devolvido).',
      icon: TrendingUp,
      accent: 'bg-emerald-100 text-emerald-800',
    },
    {
      title: 'Perdas e Divergências',
      desc: 'Monitoramento de ajustes presenciais entre sobras informadas e conferidas.',
      icon: AlertTriangle,
      accent: 'bg-amber-100 text-amber-800',
    },
    {
      title: 'Ranking de Sabores',
      desc: 'Top sabores mais vendidos e curva de giro por categoria e unidade.',
      icon: Award,
      accent: 'bg-purple-100 text-purple-800',
    },
  ]

  return (
    <Layout title="Analytics (Em breve)">
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-ocean-200 bg-ocean-50 p-4 text-ocean-950">
        <BarChart3 className="h-7 w-7 shrink-0 text-ocean-700" />
        <div>
          <p className="text-base font-extrabold">Painel de Indicadores em Desenvolvimento</p>
          <p className="text-xs font-medium text-ocean-900 sm:text-sm">
            Em breve você poderá acompanhar todos os indicadores operacionais em gráficos e
            relatórios exportáveis.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {placeholders.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.title} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.accent}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold uppercase text-slate-500">
                  Em breve
                </span>
              </div>
              <h2 className="mt-4 text-lg font-extrabold text-slate-950">{item.title}</h2>
              <p className="mt-1 text-sm font-medium text-slate-600">{item.desc}</p>
              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-1/3 rounded-full bg-slate-300/70" />
              </div>
            </div>
          )
        })}
      </div>
    </Layout>
  )
}
