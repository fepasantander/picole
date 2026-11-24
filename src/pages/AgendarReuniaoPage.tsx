import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Snowflake,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ESTADOS_BR, formatPhone, onlyDigits } from '../lib/format'

const SALES_WHATSAPP = '5511953423954'

export function AgendarReuniaoPage() {
  const [nomeSorveteria, setNomeSorveteria] = useState('')
  const [nomeResponsavel, setNomeResponsavel] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState('')
  const [cidade, setCidade] = useState('')
  const [qtdCarrinhos, setQtdCarrinhos] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [submittedWhatsAppUrl, setSubmittedWhatsAppUrl] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const phoneDigits = onlyDigits(whatsapp)
    if (phoneDigits.length < 10) {
      setErrorMsg('Informe um número de Telefone / WhatsApp válido com DDD.')
      return
    }

    setSubmitting(true)
    const parsedQtd = qtdCarrinhos.trim() ? parseInt(qtdCarrinhos, 10) : null

    const { error } = await supabase.from('solicitacoes_reuniao').insert({
      nome_sorveteria: nomeSorveteria.trim(),
      nome_responsavel: nomeResponsavel.trim(),
      whatsapp: phoneDigits,
      email: email.trim().toLowerCase() || null,
      estado: estado.toUpperCase(),
      cidade: cidade.trim(),
      qtd_carrinhos: parsedQtd && Number.isFinite(parsedQtd) ? parsedQtd : null,
      observacoes: observacoes.trim() || null,
      status: 'novo',
    })

    if (error) {
      setErrorMsg(`Não foi possível registrar sua solicitação: ${error.message}`)
      setSubmitting(false)
      return
    }

    const text = [
      'Olá! Acabei de solicitar uma reunião de implantação do Picolé na Praia:',
      `• Sorveteria: ${nomeSorveteria.trim()}`,
      `• Responsável: ${nomeResponsavel.trim()}`,
      `• Cidade/UF: ${cidade.trim()}/${estado.toUpperCase()}`,
      `• WhatsApp: ${formatPhone(phoneDigits)}`,
      email.trim() ? `• E-mail: ${email.trim()}` : null,
      parsedQtd ? `• Qtd. estimada de carrinhos/sorveteiros: ${parsedQtd}` : null,
      observacoes.trim() ? `• Observações: ${observacoes.trim()}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    setSubmittedWhatsAppUrl(`https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(text)}`)
    setSubmitting(false)
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
                Preencha os dados da sua sorveteria para agendarmos uma demonstração rápida.
              </p>
            </div>
          </div>

          {submittedWhatsAppUrl ? (
            <div className="space-y-5 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-emerald-950">Solicitação registrada!</h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-emerald-900">
                  Recebemos os dados da <strong>{nomeSorveteria}</strong>. Nossa equipe comercial
                  entrará em contato em breve pelo WhatsApp informado para agendar sua demonstração.
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                <a
                  href={submittedWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp w-full"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>Adiantar contato pelo WhatsApp</span>
                </a>

                <Link to="/" className="btn-secondary w-full">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Voltar para a página inicial</span>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3.5 text-sm font-bold text-red-900"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">
                    Nome da Sorveteria *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeSorveteria}
                    onChange={(e) => setNomeSorveteria(e.target.value)}
                    placeholder="Ex: Sorveteria Sol & Mar"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">
                    Nome do Responsável *
                  </label>
                  <input
                    type="text"
                    required
                    value={nomeResponsavel}
                    onChange={(e) => setNomeResponsavel(e.target.value)}
                    placeholder="Ex: Carlos Mendes"
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-bold text-slate-800">
                      Telefone / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      required
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                      placeholder="(00) 90000-0000"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-bold text-slate-800">
                      E-mail (opcional)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contato@sorveteria.com"
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-bold text-slate-800">
                      Estado (UF) *
                    </label>
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

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">
                    Quantidade estimada de carrinhos/sorveteiros (opcional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={qtdCarrinhos}
                    onChange={(e) => setQtdCarrinhos(e.target.value)}
                    placeholder="Ex: 15"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-800">
                    Observações / Praias de atuação (opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Conte quais praias atende, marcas com que trabalha ou melhor horário para contato..."
                    className="input-field min-h-[92px] py-3"
                  />
                </div>

                <button type="submit" disabled={submitting} className="btn-primary mt-2 w-full">
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Enviando solicitação...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="h-5 w-5" />
                      <span>Solicitar Reunião de Implantação</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
