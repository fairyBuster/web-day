import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import backIcon from '../../assets/5_363.svg'
import ErrorModal from '../../components/ErrorModal'
import ApiImage from '../../components/ApiImage'

const SALT = 'KXXADFDFDF'

// Kosong = pakai proxy Vite (/api). Diisi jika backend dipanggil langsung (butuh CORS).
const API_BASE = (import.meta.env.VITE_API_URL || '').trim()

// Decode response SaltedBase64Reverse:
// JSON → base64 → +salt → dibalik, dibungkus {"data": "..."}
const decodeSaltedBase64 = (encoded) => {
  const reversed = encoded.split('').reverse().join('')
  const b64 = reversed.slice(0, reversed.length - SALT.length)
  const binary = atob(b64)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

// Beberapa endpoint tidak dienkode — fallback ke JSON biasa
const parseResponse = (json) => {
  if (typeof json?.data === 'string') return decodeSaltedBase64(json.data)
  return json
}

// Format tanggal API → "22 Agustus 2026, 08:15"
const formatDate = (dateStr) => {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr || ''
  const datePart = d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const timePart = d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${datePart}, ${timePart}`
}

function NewsDetailPage({ newsId, onBackClick }) {
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadArticle = async () => {
    if (!newsId) {
      setLoading(false)
      return
    }
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/news/${newsId}/`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      let json
      try {
        json = await res.json()
      } catch (parseErr) {
        // Response bukan JSON (mis. HTML 404 dari Vite tanpa proxy)
        setError(
          `Terjadi kesalahan koneksi. Tolong segarkan halamannya.`,
        )
        return
      }
      const data = parseResponse(json)
      if (!res.ok) {
        setError(getErrorMessage(data, 'Gagal memuat berita.'))
        return
      }
      setArticle(data)
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadArticle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const bodyParagraphs = article?.body
    ? String(article.body).split(/\r?\n\r?\n/)
    : []

  return (
    <div className="min-h-screen font-sans">
      {/* Header Section: Fixed top navigation with back button and title */}
      <section className="sticky top-0 z-50 w-full">
        <div className="max-w-md mx-auto bg-primary text-white relative flex items-center px-4 py-3.5 shadow-md">
          {/* Back Button */}
          <button
            type="button"
            onClick={onBackClick}
            className="absolute left-4 flex items-center justify-center w-7 h-7 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Go back"
          >
            <img src={backIcon} alt="Back Icon" className="w-[18px] h-[18px]" />
          </button>
          {/* Page Title */}
          <h1 className="w-full text-center font-semibold text-base tracking-wide">
            Detail Berita
          </h1>
        </div>
      </section>

      {loading ? (
        <div className="max-w-md mx-auto bg-background min-h-screen">
          <p className="text-textLight text-sm text-center py-16">
            Memuat berita...
          </p>
        </div>
      ) : article ? (
        <>
          {/* Hero Section: News article image */}
          <section className="w-full">
            <div className="max-w-md mx-auto bg-background">
              <div className="w-full h-[200px] bg-imageBg border-y border-imageBorder overflow-hidden">
                {article.image ? (
                  <ApiImage
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>
            </div>
          </section>

          {/* Content Section: Article title, metadata, and body text */}
          <section className="w-full min-h-screen">
            <div className="max-w-md mx-auto bg-background px-5 py-5 pb-12 flex flex-col gap-5">
              {/* Article Header Area */}
              <div className="flex flex-col gap-3">
                {/* Main Title */}
                <h2 className="text-textDark text-xl font-bold leading-snug">
                  {article.title}
                </h2>

                {/* Metadata Row (Date & Author) */}
                <div className="flex items-center gap-2 text-xs text-textLight font-medium">
                  <span>{formatDate(article.published_at)}</span>
                  <span className="w-[3px] h-[3px] rounded-full bg-textLight"></span>
                  <span>{article.author_name || 'Admin'}</span>
                </div>
              </div>

              {/* Article Body Text */}
              <div className="flex flex-col gap-[13px] text-textGray text-[15px] leading-relaxed">
                {bodyParagraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        <div className="max-w-md mx-auto bg-background min-h-screen">
          <p className="text-textLight text-sm text-center py-16">
            Berita tidak ditemukan.
          </p>
        </div>
      )}

      <ErrorModal
        open={Boolean(error)}
        title="Gagal Memuat Berita"
        message={error}
        onClose={() => setError('')}
      />
    </div>
  )
}

export default NewsDetailPage
