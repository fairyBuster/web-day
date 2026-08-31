// Fetch gambar media dari backend sebagai blob → objectURL.
// Pola: ampli-frontend src/utils/imageCache.js — <img> biasa tidak bisa
// membawa Authorization header, sedangkan media backend bisa butuh auth.
// URL /media/... (relatif) dipetakan ke origin backend supaya tidak kena
// SPA fallback frontend (index.html).

function getAuthHeaders() {
  try {
    // Coba beberapa key token — beda aplikasi bisa beda key (ampli: auth_token)
    const keys = ['access_token', 'auth_token', 'token']
    for (const key of keys) {
      const token = localStorage.getItem(key)
      if (token) {
        const scheme = localStorage.getItem('auth_scheme') || 'Bearer'
        return { Authorization: `${scheme} ${token}` }
      }
    }
  } catch (_) {}
  return {}
}

const ENV = import.meta.env || {}
const RUNTIME_ORIGIN = typeof window !== 'undefined' ? window.location.origin : ''
const BACKEND_URL = (ENV.VITE_BACKEND_URL || '').trim()
const API_URL = (ENV.VITE_API_URL || '').trim()

// Origin media: VITE_BACKEND_URL → VITE_API_URL → origin frontend
// (origin frontend = path relatif yang diproxy server ke backend, tanpa CORS)
let BACKEND_ORIGIN = ''
if (BACKEND_URL && /^https?:\/\//.test(BACKEND_URL)) BACKEND_ORIGIN = new URL(BACKEND_URL).origin
if (!BACKEND_ORIGIN && API_URL && /^https?:\/\//.test(API_URL)) BACKEND_ORIGIN = new URL(API_URL).origin
if (!BACKEND_ORIGIN) BACKEND_ORIGIN = RUNTIME_ORIGIN || ''

// Path /media/... → origin backend; path lain tetap; URL absolut dibiarkan
const toMediaUrl = (url) => {
  let normalized = String(url ?? '').trim()
  if (!normalized) return ''
  try {
    if (/^\/.+/.test(normalized)) {
      if (normalized.startsWith('/media/')) return `${BACKEND_ORIGIN}${normalized}`
      return `${RUNTIME_ORIGIN}${normalized}`
    }
    const u = new URL(normalized)
    if (u.pathname.startsWith('/media')) return `${BACKEND_ORIGIN}${u.pathname}${u.search}`
    return normalized
  } catch (_) {
    return normalized
  }
}

// Cache in-memory per URL (Cache API butuh HTTPS, tidak selalu tersedia)
const blobCache = new Map()

// Fetch gambar → blob → objectURL. Return { objectUrl } atau { error }
export async function fetchImageWithCache(url, options = {}) {
  const source = toMediaUrl(url)
  if (!source) return { error: true, message: 'URL gambar kosong' }
  if (blobCache.has(source)) return { objectUrl: blobCache.get(source), cacheKey: source }

  // Coba dengan auth dulu; kalau 401/403, coba lagi tanpa auth
  // (ada backend yang media-nya publik tapi menolak request ber-auth)
  for (const withAuth of [true, false]) {
    try {
      const resp = await fetch(source, {
        method: 'GET',
        credentials: 'include',
        headers: {
          ...(options.headers || {}),
          ...(withAuth ? getAuthHeaders() : {}),
          'X-Requested-With': 'XMLHttpRequest',
        },
        referrerPolicy: 'strict-origin-when-cross-origin',
      })
      if (!resp.ok) {
        if ((resp.status === 401 || resp.status === 403) && withAuth) continue
        return { error: true, message: `status ${resp.status}`, cacheKey: source }
      }
      const contentType = resp.headers.get('content-type') || ''
      if (!contentType.includes('image')) {
        return { error: true, message: `bukan gambar: ${contentType}`, cacheKey: source }
      }
      const blob = await resp.blob()
      const objectUrl = URL.createObjectURL(blob)
      blobCache.set(source, objectUrl)
      return { objectUrl, cacheKey: source }
    } catch (err) {
      return { error: true, message: 'Gagal mengambil gambar', cacheKey: source }
    }
  }
  return { error: true, message: 'status 401', cacheKey: source }
}
