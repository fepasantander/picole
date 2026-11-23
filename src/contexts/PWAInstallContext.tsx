import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

interface PWAInstallContextValue {
  canInstallPrompt: boolean
  isIOS: boolean
  isStandalone: boolean
  showIOSGuide: boolean
  setShowIOSGuide: (open: boolean) => void
  promptInstall: () => Promise<void>
  dismissed: boolean
  dismissBanner: () => void
}

const PWAInstallContext = createContext<PWAInstallContextValue | undefined>(undefined)

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean(nav.standalone)
  )
}

export function PWAInstallProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS] = useState<boolean>(() => detectIOS())
  const [isStandalone, setIsStandalone] = useState<boolean>(() => detectStandalone())
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('picole-pwa-banner-dismissed') === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const handleInstalled = () => {
      setIsStandalone(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null)
      }
      return
    }
    if (isIOS) {
      setShowIOSGuide(true)
      return
    }
    // Fallback guide for browsers that don't fire beforeinstallprompt yet
    setShowIOSGuide(true)
  }, [deferredPrompt, isIOS])

  const dismissBanner = useCallback(() => {
    setDismissed(true)
    try {
      sessionStorage.setItem('picole-pwa-banner-dismissed', '1')
    } catch {
      // ignore storage errors
    }
  }, [])

  return (
    <PWAInstallContext.Provider
      value={{
        canInstallPrompt: Boolean(deferredPrompt),
        isIOS,
        isStandalone,
        showIOSGuide,
        setShowIOSGuide,
        promptInstall,
        dismissed,
        dismissBanner,
      }}
    >
      {children}
    </PWAInstallContext.Provider>
  )
}

export function usePWAInstall(): PWAInstallContextValue {
  const ctx = useContext(PWAInstallContext)
  if (!ctx) {
    throw new Error('usePWAInstall deve ser usado dentro de PWAInstallProvider')
  }
  return ctx
}
