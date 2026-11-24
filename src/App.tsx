import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { PWAInstallProvider } from './contexts/PWAInstallContext'
import { getHomePathForRole, ProtectedRoute } from './components/ProtectedRoute'

import { LandingPage } from './pages/LandingPage'
import { AgendarReuniaoPage } from './pages/AgendarReuniaoPage'
import { LoginPage } from './pages/LoginPage'
import { CadastroSorveteiroPage } from './pages/CadastroSorveteiroPage'
import { AguardandoAprovacaoPage } from './pages/AguardandoAprovacaoPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { ConfiguracoesPage } from './pages/ConfiguracoesPage'

import { SuperadminSorveteriasPage } from './pages/superadmin/SuperadminSorveteriasPage'
import { SuperadminSorveteriaDetalhePage } from './pages/superadmin/SuperadminSorveteriaDetalhePage'
import { SuperadminUsuariosPage } from './pages/superadmin/SuperadminUsuariosPage'
import { SuperadminCatalogoPage } from './pages/superadmin/SuperadminCatalogoPage'
import { SuperadminCobrancasPage } from './pages/superadmin/SuperadminCobrancasPage'

import { SorveteriaEquipePage } from './pages/sorveteria/SorveteriaEquipePage'
import { SorveteriaCatalogoPage } from './pages/sorveteria/SorveteriaCatalogoPage'
import { SorveteriaJornadasPage } from './pages/sorveteria/SorveteriaJornadasPage'
import { SorveteriaSeparacaoPage } from './pages/sorveteria/SorveteriaSeparacaoPage'
import { SorveteriaFechamentoPage } from './pages/sorveteria/SorveteriaFechamentoPage'

import { SorveteiroHomePage } from './pages/sorveteiro/SorveteiroHomePage'
import { NovaJornadaPage } from './pages/sorveteiro/NovaJornadaPage'
import { JornadaDetalhePage } from './pages/sorveteiro/JornadaDetalhePage'
import { JornadaSobrasPage } from './pages/sorveteiro/JornadaSobrasPage'
import { ConfirmarSobrasPage } from './pages/sorveteiro/ConfirmarSobrasPage'

function RootRedirect() {
  const { user, perfil, sorveteria, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (
    !perfil ||
    (perfil.role !== 'superadmin' &&
      ((sorveteria && sorveteria.ativo === false) || perfil.status_aprovacao !== 'aprovado'))
  ) {
    return <Navigate to="/aguardando-aprovacao" replace />
  }
  return <Navigate to={getHomePathForRole(perfil.role)} replace />
}

export function App() {
  return (
    <PWAInstallProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public / Auth */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/agendar-reuniao" element={<AgendarReuniaoPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro-sorveteiro" element={<CadastroSorveteiroPage />} />
            <Route path="/aguardando-aprovacao" element={<AguardandoAprovacaoPage />} />

            {/* Painel Superadmin */}
            <Route
              path="/superadmin"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <Navigate to="/superadmin/sorveterias" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/sorveterias"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <SuperadminSorveteriasPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/sorveterias/:id"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <SuperadminSorveteriaDetalhePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/usuarios"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <SuperadminUsuariosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/catalogo"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <SuperadminCatalogoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/cobrancas"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <SuperadminCobrancasPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin/analytics"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />

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
            <Route
              path="/sorveteria/analytics"
              element={
                <ProtectedRoute allowedRoles={['sorveteria']}>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sorveteria/configuracoes"
              element={
                <ProtectedRoute allowedRoles={['sorveteria']}>
                  <ConfiguracoesPage />
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
            <Route
              path="/app/configuracoes"
              element={
                <ProtectedRoute allowedRoles={['sorveteiro']}>
                  <ConfiguracoesPage />
                </ProtectedRoute>
              }
            />

            {/* Shared Jornada URL */}
            <Route
              path="/jornada/:id"
              element={
                <ProtectedRoute allowedRoles={['sorveteiro', 'sorveteria', 'superadmin']}>
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
            <Route
              path="/jornada/:id/sobras/confirmar"
              element={
                <ProtectedRoute allowedRoles={['sorveteiro']}>
                  <ConfirmarSobrasPage />
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
