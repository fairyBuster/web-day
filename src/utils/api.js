// Helper pesan error API yang ramah pengguna.

// Body respons dianggap berisi pesan error kalau ada minimal satu nilai
// string/array pesan (detail, error, pesan per-field, dll. dari backend).
const hasErrorContent = (json) => {
  if (!json || typeof json !== 'object') return false
  return Object.keys(json).some((key) => {
    const value = json[key]
    if (Array.isArray(value)) {
      return value.some(
        (item) => typeof item === 'string' && item.trim() !== '',
      )
    }
    return typeof value === 'string' && value.trim() !== ''
  })
}

// Semua notif error dari server ditampilkan sebagai "Kesalahan sistem"
// (pesan teknis backend tidak pernah ditampilkan ke pengguna).
// Fallback hanya dipakai kalau respons tidak membawa pesan error sama sekali.
const getErrorMessage = (json, fallback) => {
  if (hasErrorContent(json)) return 'Kesalahan sistem'
  return fallback || 'Kesalahan sistem'
}

export { getErrorMessage }
