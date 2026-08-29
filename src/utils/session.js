// Helper sesi: deteksi kedaluwarsa token JWT & pembersihan sesi.
// Dipakai App.jsx untuk auto-logout dan halaman lain yang perlu merespons 401.

// Baca klaim exp dari access token (JWT) → timestamp ms, atau null jika bukan JWT
const getTokenExpiryMs = () => {
  const token = localStorage.getItem('access_token')
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(normalized)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const parsed = JSON.parse(new TextDecoder().decode(bytes))
    return typeof parsed.exp === 'number' ? parsed.exp * 1000 : null
  } catch (err) {
    return null
  }
}

// Hapus semua data sesi dari localStorage
const clearSession = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  localStorage.removeItem('app_page')
  localStorage.removeItem('app_product_id')
  localStorage.removeItem('app_news_id')
}

// Bersihkan sesi + kabari aplikasi bahwa sesi berakhir (untuk respons 401)
const dispatchSessionExpired = () => {
  clearSession()
  window.dispatchEvent(new Event('auth:session-expired'))
}

export { getTokenExpiryMs, clearSession, dispatchSessionExpired }
