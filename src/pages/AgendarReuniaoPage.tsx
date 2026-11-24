import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Calendar, CheckCircle2, MessageCircle, Snowflake } from 'lucide-react'
import { ESTADOS_BR, formatPhone } from '../lib/format'

const SALES_WHATSAPP = '5511953423954'

export function AgendarReuniaoPage() {
  const [nome, setNome] = useState('')
  const [sorveteria, setSorveteria] = useState('')
  const [estado, setEstado] = useState('')
  const [cidade, setCidade] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [qtdSorveteiros, setQtdSorveteiros] = useState('')
  const [melhorHorario, setMelhorHorario] = useState('Manhã (09h às 12h)')
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const text = [
      'Olá! Gostaria de agendar uma reunião de implantação do Picolé na Praia:',
      `• Nome: ${nome.trim()}`,
      `• Sorveteria: ${sorveteria.trim()}`,
      `• Cidade/UF: ${cidade.trim()}/${estado}`,
      `• WhatsApp: ${whatsapp}`,
      qtdSorveteiros ? `• Qtd. aproximada de carrinhos/sorveteiros: ${qtdSorveteiros}` : null,
      `• Melhor horário: ${melhorHorario}`,
    ]
      .filter(Boolean)
      .join('\n')

    const url = `https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-xl">
        <Link
          to="/"
          className="mb-4 inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-ocean-800 hover:text-ocean-950"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para a página inicial</span>
        </Link>

        <div className="card p-6 shadow-md sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ocean-700 text-sun-400">
              <Snowflake className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-950">
                Solicitar Reunião de Implantação
              </h1>
              <p className="text-sm font-medium text-slate-600">
                Preencha seus dados para agendar uma demonstração rápida pelo WhatsApp.
              </p>
            </div>
          </div>

          {sent ? (
            <div className="space-y-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-700" />
              <h2 className="text-xl font-black text-emerald-950">Solicitação pronta no WhatsApp!</h2>
              <p className="text-sm font-medium text-emerald-900">
                Caso a janela do WhatsApp não tenha aberto automaticamente, clique no botão abaixo
                para iniciar a conversa.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="btn-secondary w-full"
              >
                Editar informações
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">Seu nome *</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Carlos Mendes"
                  className="input-field"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">
                  Nome da Sorveteria *
                </label>
                <input
                  type="text"
                  required
                  value={sorveteria}
                  onChange={(e) => setSorveteria(e.target.value)}
                  placeholder="Ex: Sorveteria Sol & Mar"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">UF *</label>
                  <select
                    required
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="input-field"
                  >
                    <option value="">UF</option>
                    {ESTADOS_BR.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-sm font-bold text-slate-800">Cidade *</label>
                  <input
                    type="text"
                    required
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Ex: Guarujá"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                    placeholder="(00) 90000-0000"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">
                    Qtd. de carrinhos/sorveteiros
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={qtdSorveteiros}
                    onChange={(e) => setQtdSorveteiros(e.target.value)}
                    placeholder="Ex: 15"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">
                  Melhor horário para contato
                </label>
                <select
                  value={melhorHorario}
                  onChange={(e) => setMelhorHorario(e.target.value)}
                  className="input-field"
                >
                  <option value="Manhã (09h às 12h)">Manhã (09h às 12h)</option>
                  <option value="Tarde (13h às 18h)">Tarde (13h às 18h)</option>
                  <option value="Noite (18h às 20h)">Noite (18h às 20h)</option>
                </select>
              </div>

              <button type="submit" className="btn-whatsapp mt-2 w-full">
                <MessageCircle className="h-5 w-5" />
                <span>Agendar Reunião pelo WhatsApp</span>
                <Calendar className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
