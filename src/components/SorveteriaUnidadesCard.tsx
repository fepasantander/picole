import React, { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Power,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatPhone, onlyDigits } from '../lib/format'
import type { SorveteriaUnidade } from '../types/database'

interface SorveteriaUnidadesCardProps {
  sorveteriaId: string
  sorveteriaNome: string
}

export function SorveteriaUnidadesCard({
  sorveteriaId,
  sorveteriaNome,
}: SorveteriaUnidadesCardProps) {
  const [unidades, setUnidades] = useState<SorveteriaUnidade[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Modal: Criar / Editar Unidade
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [endereco, setEndereco] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  const loadUnidades = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sorveteria_unidades')
      .select('*')
      .eq('sorveteria_id', sorveteriaId)
      .order('nome', { ascending: true })

    if (error) {
      setErrorMsg(`Erro ao carregar unidades: ${error.message}`)
    } else {
      setUnidades((data ?? []) as SorveteriaUnidade[])
    }
    setLoading(false)
  }, [sorveteriaId])

  useEffect(() => {
    loadUnidades()
  }, [loadUnidades])

  const openCreateModal = () => {
    setModalMode('create')
    setEditingId(null)
    setNome('')
    setEndereco('')
    setWhatsapp('')
    setErrorMsg(null)
  }

  const openEditModal = (u: SorveteriaUnidade) => {
    setModalMode('edit')
    setEditingId(u.id)
    setNome(u.nome)
    setEndereco(u.endereco || '')
    setWhatsapp(u.whatsapp ? formatPhone(u.whatsapp) : '')
    setErrorMsg(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return
    setBusy(true)
    setErrorMsg(null)
    setFeedback(null)

    const payload = {
      nome: nome.trim(),
      endereco: endereco.trim() || null,
      whatsapp: onlyDigits(whatsapp) || null,
    }

    if (modalMode === 'create') {
      const { error } = await supabase.from('sorveteria_unidades').insert({
        sorveteria_id: sorveteriaId,
        ...payload,
        ativo: true,
      })

      if (error) {
        setErrorMsg(`Erro ao criar unidade: ${error.message}`)
      } else {
        setModalMode(null)
        setFeedback(`Unidade "${payload.nome}" cadastrada com sucesso!`)
        await loadUnidades()
      }
    } else if (modalMode === 'edit' && editingId) {
      const { error } = await supabase
        .from('sorveteria_unidades')
        .update(payload)
        .eq('id', editingId)

      if (error) {
        setErrorMsg(`Erro ao atualizar unidade: ${error.message}`)
      } else {
        setModalMode(null)
        setFeedback(`Unidade "${payload.nome}" atualizada com sucesso!`)
        await loadUnidades()
      }
    }
    setBusy(false)
  }

  const toggleAtivo = async (u: SorveteriaUnidade) => {
    const next = !u.ativo
    setUnidades((prev) => prev.map((item) => (item.id === u.id ? { ...item, ativo: next } : item)))
    const { error } = await supabase
      .from('sorveteria_unidades')
      .update({ ativo: next })
      .eq('id', u.id)

    if (error) {
      setErrorMsg(`Erro ao alterar status da unidade: ${error.message}`)
      await loadUnidades()
    } else {
      setFeedback(next ? `Unidade "${u.nome}" ativada.` : `Unidade "${u.nome}" desativada.`)
    }
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ocean-100 text-ocean-800">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-950">Unidades da Sorveteria</h2>
            <p className="text-xs font-medium text-slate-500">
              Pontos físicos de retirada vinculados à {sorveteriaNome} (ex.: Unidade Perequê-Açu).
            </p>
          </div>
        </div>

        <button type="button" onClick={openCreateModal} className="btn-primary">
          <Plus className="h-5 w-5" />
          <span>+ Nova Unidade</span>
        </button>
      </div>

      {feedback && (
        <div className="mx-5 mt-4 flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
            <span>{feedback}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mx-5 mt-4 flex items-start justify-between gap-2 rounded-xl border border-red-300 bg-red-50 p-3.5 text-sm font-bold text-red-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-7 w-7 animate-spin text-ocean-700" />
        </div>
      ) : unidades.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm font-bold text-slate-600">
            Nenhuma unidade física cadastrada ainda.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Clique em &ldquo;+ Nova Unidade&rdquo; para criar os pontos de retirada desta marca.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {unidades.map((u) => (
            <div
              key={u.id}
              className={`flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between ${
                !u.ativo ? 'bg-slate-50/80 opacity-80' : ''
              }`}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-extrabold text-slate-950">{u.nome}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                      u.ativo
                        ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
                        : 'border-slate-300 bg-slate-200 text-slate-600'
                    }`}
                  >
                    {u.ativo ? 'Ativa' : 'Desativada'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-600">
                  {u.endereco && <span>{u.endereco}</span>}
                  {u.whatsapp && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {formatPhone(u.whatsapp)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openEditModal(u)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  title="Editar unidade"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleAtivo(u)}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                    u.ativo
                      ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  title={u.ativo ? 'Desativar unidade' : 'Ativar unidade'}
                >
                  <Power className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar / Editar Unidade */}
      {modalMode && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-slate-950">
                {modalMode === 'create' ? 'Nova Unidade' : 'Editar Unidade'}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">
                  Nome da Unidade *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Unidade Perequê-Açu"
                  className="input-field"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">Endereço</label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Rua, número, bairro"
                  className="input-field"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-800">
                  WhatsApp da Unidade
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                  placeholder="(00) 90000-0000"
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setModalMode(null)}
                  className="btn-secondary w-full"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={busy} className="btn-primary w-full">
                  {busy ? 'Salvando...' : modalMode === 'create' ? 'Criar Unidade' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
