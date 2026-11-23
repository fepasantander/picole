import { Download, PlusSquare, Share, Smartphone, X } from 'lucide-react'
import { usePWAInstall } from '../contexts/PWAInstallContext'

interface InstallPWABannerProps {
  variant?: 'banner' | 'button'
}

export function InstallPWABanner({ variant = 'banner' }: InstallPWABannerProps) {
  const {
    canInstallPrompt,
    isIOS,
    isStandalone,
    showIOSGuide,
    setShowIOSGuide,
    promptInstall,
    dismissed,
    dismissBanner,
  } = usePWAInstall()

  if (isStandalone) return null

  const modal = showIOSGuide && (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-guide-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ocean-100 text-ocean-700">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h2 id="pwa-guide-title" className="text-lg font-extrabold text-slate-900">
                Instalar o app Picole
              </h2>
              <p className="text-sm text-slate-600">
                Acesse direto da tela inicial do celular
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowIOSGuide(false)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Fechar instruções"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isIOS ? (
          <ol className="mt-5 space-y-3 text-sm font-medium text-slate-800">
            <li className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ocean-700 text-xs font-bold text-white">
                1
              </span>
              <span className="flex items-center gap-1.5">
                Toque no botão <Share className="inline h-4 w-4 text-ocean-700" />{' '}
                <strong>Compartilhar</strong> no Safari.
              </span>
            </li>
            <li className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ocean-700 text-xs font-bold text-white">
                2
              </span>
              <span className="flex items-center gap-1.5">
                Role e toque em <PlusSquare className="inline h-4 w-4 text-ocean-700" />{' '}
                <strong>Adicionar à Tela de Início</strong>.
              </span>
            </li>
            <li className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ocean-700 text-xs font-bold text-white">
                3
              </span>
              <span>
                Toque em <strong>Adicionar</strong> no canto superior direito.
              </span>
            </li>
          </ol>
        ) : (
          <ol className="mt-5 space-y-3 text-sm font-medium text-slate-800">
            <li className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ocean-700 text-xs font-bold text-white">
                1
              </span>
              <span>Abra o menu do navegador (três pontos no canto superior).</span>
            </li>
            <li className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ocean-700 text-xs font-bold text-white">
                2
              </span>
              <span>
                Selecione <strong>Instalar aplicativo</strong> ou{' '}
                <strong>Adicionar à tela inicial</strong>.
              </span>
            </li>
          </ol>
        )}

        <button
          type="button"
          onClick={() => setShowIOSGuide(false)}
          className="btn-primary mt-6 w-full"
        >
          Entendi
        </button>
      </div>
    </div>
  )

  if (variant === 'button') {
    return (
      <>
        <button
          type="button"
          onClick={promptInstall}
          className="btn-secondary w-full border-ocean-300 bg-ocean-50 text-ocean-900 hover:bg-ocean-100"
        >
          <Download className="h-5 w-5 text-ocean-700" />
          <span>{canInstallPrompt ? 'Baixar App (Instalar)' : 'Como baixar o App no celular'}</span>
        </button>
        {modal}
      </>
    )
  }

  if (dismissed) return modal

  return (
    <>
      <div className="border-b border-ocean-200 bg-ocean-900 px-4 py-2.5 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Download className="h-5 w-5 shrink-0 text-sun-400" />
            <p className="truncate text-sm font-semibold">
              {canInstallPrompt
                ? 'Instale o Picole na tela inicial do celular'
                : isIOS
                  ? 'Adicione o Picole à Tela de Início (iOS)'
                  : 'Baixe o app Picole para acesso rápido'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={promptInstall}
              className="min-h-[38px] rounded-lg bg-sun-400 px-3.5 py-1.5 text-sm font-extrabold text-slate-950 hover:bg-sun-500"
            >
              Baixar App
            </button>
            <button
              type="button"
              onClick={dismissBanner}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ocean-200 hover:bg-ocean-800 hover:text-white"
              aria-label="Ocultar aviso de instalação"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      {modal}
    </>
  )
}
