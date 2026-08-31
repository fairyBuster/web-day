import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Intercept fetch global: kalau API ber-auth balas 401, session dianggap
// expired → App.jsx mendengar event 'auth:session-expired' → redirect login.
// Hanya request ke path /api/ yang membawa Authorization — 401 media
// (/media/...) atau request publik tidak memicu logout.
const originalFetch = window.fetch
window.fetch = async (...args) => {
  const res = await originalFetch(...args)
  try {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || ''
    const options = args[1] || {}
    if (res.status === 401 && url.includes('/api/')) {
      const rawHeaders = options.headers || {}
      const hasAuth =
        JSON.stringify(rawHeaders).includes('Authorization') ||
        (typeof rawHeaders.get === 'function' && Boolean(rawHeaders.get('Authorization')))
      if (hasAuth) {
        window.dispatchEvent(new CustomEvent('auth:session-expired'))
      }
    }
  } catch (_) {
    // Jangan pernah menggagalkan request asli karena logic di atas
  }
  return res
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
