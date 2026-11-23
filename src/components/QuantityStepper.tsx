import { Minus, Plus } from 'lucide-react'

interface QuantityStepperProps {
  value: number
  onChange: (nextValue: number) => void
  min?: number
  max?: number
  disabled?: boolean
  label?: string
}

/**
 * Componente padronizado <QuantityStepper />:
 * Botão quadrado [-] à esquerda, número centralizado (com digitação direta) ao meio,
 * botão quadrado [+] à direita. Altura mínima de 48px para uso sob luz solar na praia.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  disabled = false,
  label = 'Quantidade',
}: QuantityStepperProps) {
  const safeValue = Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min

  const handleDecrement = () => {
    if (disabled || safeValue <= min) return
    onChange(Math.max(min, safeValue - 1))
  }

  const handleIncrement = () => {
    if (disabled || safeValue >= max) return
    onChange(Math.min(max, safeValue + 1))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const raw = e.target.value.replace(/\D/g, '')
    if (raw === '') {
      onChange(min)
      return
    }
    const parsed = parseInt(raw, 10)
    if (!Number.isNaN(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)))
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5" role="group" aria-label={label}>
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || safeValue <= min}
        aria-label={`Diminuir ${label}`}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-slate-300 bg-slate-100 text-slate-900 shadow-sm transition-colors hover:bg-slate-200 active:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus className="h-5 w-5 stroke-[2.75]" />
      </button>

      <input
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        min={min}
        max={max}
        disabled={disabled}
        value={safeValue}
        onFocus={(e) => e.currentTarget.select()}
        onChange={handleInputChange}
        aria-label={label}
        className="h-12 w-16 rounded-xl border-2 border-slate-300 bg-white text-center text-lg font-extrabold text-slate-950 focus:border-ocean-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
      />

      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || safeValue >= max}
        aria-label={`Aumentar ${label}`}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-ocean-700 bg-ocean-700 text-white shadow-sm transition-colors hover:bg-ocean-800 active:bg-ocean-900 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-5 w-5 stroke-[2.75]" />
      </button>
    </div>
  )
}
