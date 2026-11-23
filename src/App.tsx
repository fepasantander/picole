import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { PWAInstallProvider } from './contexts/PWAInstallContext'
import { ProtectedRoute } from './components/ProtectedRoute'

import { LoginPage } from './pages/LoginPage'
import { CadastroSorveteiroPage } from './pages/CadastroSorveteiroPage'
import { AguardandoAprovacaoPage } from './pages/AguardandoAprovacaoPage'

import { SorveteriaEquipePage } from './pages/sorveteria/SorveteriaEquipePage'
import { SorveteriaCatalogoPage } from './pages/sorveteria/SorveteriaCatalogoPage'
import { SorveteriaJornadasPage } from './pages/sorveteria/SorveteriaJornadasPage'
import { SorveteriaSeparacaoPage } from './pages/sorveteria/SorveteriaSeparacaoPage'
import { SorveteriaFechamentoPage } from './pages/sorveteria/SorveteriaFechamentoPage'

import { SorveteiroHomePage } from './pages/sorveteiro/SorveteiroHomePage'
import { NovaJornadaPage } from './pages/sorveteiro/NovaJornadaPage'
import { JornadaDetalhePage } from './pages/sorveteiro/JornadaDetalhePage'
import { JornadaSobrasPage } from './pages/sorveteiro/JornadaSobrasPage'

function RootRedirect() {
  const { user, perfil, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!perfil || (perfil.role === 'sorveteiro' && perfil.status_aprovacao !== 'aprovado')) {
    return <Navigate to="/aguardando-aprovacao" replace />
  }
  return (
    <Navigate
      to={perfil.role === 'sorveteria' ? '/sorveteria/jornadas' : '/app'}
      replace
    />
  )
}

export function App() {
  return (
    <PWAInstallProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public / Auth */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro-sorveteiro" element={<CadastroSorveteiroPage />} />
            <Route path="/aguardando-aprovacao" element={<AguardandoAprovacaoPage />} />

            {/* Back-office Sorveteria */}
            <Route
              path="/sorveteria"
              element={
                <ProtectedRoute allowedRoles={['sorveteria']}>
                  <Navigate to="/sorveteria/jornadas" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sorveteria/equipe"
              element={
                <ProtectedRoute allowedRoles={['sorveteria']}>
                  <SorveteriaEquipePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sorveteria/catalogo"
              element={
                <ProtectedRoute allowedRoles={['sorveteria']}>
                  <SorveteriaCatalogoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sorveteria/jornadas"
              element={
                <ProtectedRoute allowedRoles={['sorveteria']}>
                  <SorveteriaJornadasPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sorveteria/jornadas/:id"
              element={
                <ProtectedRoute allowedRoles={['sorveteria']}>
                  <SorveteriaSeparacaoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sorveteria/jornadas/:id/fechamento"
              element={
                <ProtectedRoute allowedRoles={['sorveteria']}>
                  <SorveteriaFechamentoPage />
                </ProtectedRoute>
              }
            />

            {/* App Sorveteiro */}
            <Route
              path="/app"
              element={
                <ProtectedRoute allowedRoles={['sorveteiro']}>
                  <SorveteiroHomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/nova-jornada"
              element={
                <ProtectedRoute allowedRoles={['sorveteiro']}>
                  <NovaJornadaPage />
                </ProtectedRoute>
              }
            />

            {/* Shared Jornada URL (Sorveteiro views directly; Sorveteria auto-redirects to back-office) */}
            <Route
              path="/jornada/:id"
              element={
                <ProtectedRoute allowedRoles={['sorveteiro', 'sorveteria']}>
                  <JornadaDetalhePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jornada/:id/sobras"
              element={
                <ProtectedRoute allowedRoles={['sorveteiro']}>
                  <JornadaSobrasPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </PWAInstallProvider>
  )
}

export default App
