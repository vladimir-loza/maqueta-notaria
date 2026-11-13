import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout'
import Calendario from './pages/Calendario'
import CuentaCorriente from './pages/CuentaCorriente'
import ExpedienteDetalle from './pages/ExpedienteDetalle'
import Expedientes from './pages/Expedientes'
import NuevoExpediente from './pages/NuevoExpediente'
import TramiteEditor from './pages/TramiteEditor'
import Tramites from './pages/Tramites'
import Vencimientos from './pages/Vencimientos'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Vencimientos /> },
      { path: 'expedientes', element: <Expedientes /> },
      { path: 'expedientes/nuevo', element: <NuevoExpediente /> },
      { path: 'expedientes/:id', element: <ExpedienteDetalle /> },
      { path: 'cuenta', element: <CuentaCorriente /> },
      { path: 'tramites', element: <Tramites /> },
      { path: 'tramites/:id', element: <TramiteEditor /> },
      { path: 'calendario', element: <Calendario /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
