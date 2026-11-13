import { useSearchParams } from 'react-router-dom'

/**
 * Un filtro guardado en la URL: se conserva al ir a un expediente y volver.
 * Parte de la URL actual (no de la del render) para no pisar otro filtro cambiado al mismo tiempo.
 */
export function useFiltroUrl(clave: string, inicial = ''): [string, (v: string) => void] {
  const [params, setParams] = useSearchParams()
  const fijar = (v: string) => {
    const p = new URLSearchParams(window.location.search)
    if (v && v !== inicial) p.set(clave, v)
    else p.delete(clave)
    setParams(p, { replace: true })
  }
  return [params.get(clave) ?? inicial, fijar]
}
