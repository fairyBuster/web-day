import { useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import backIcon from '../../assets/5_282.svg'
import ErrorModal from '../../components/ErrorModal'

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

const categories = ['Semua', 'Promo', 'Pengumuman', 'Tutorial', 'FAQ']

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

function NewsPage({ onBackClick, onArticleClick }) {
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [news, setNews] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  // Penanda urutan request kategori — mencegah respons lama menimpa yang baru
  const categorySeq = useRef(0)

  const loadNews = async (pageNum, append = false) => {
    if (!append) setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/news/?page=${pageNum}`, {
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
      const results = Array.isArray(data.results) ? data.results : []
      setNews((prev) => (append ? [...prev, ...results] : results))
      setHasMore(Boolean(data.next))
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Muat semua halaman lalu filter berdasarkan kategori (client-side)
  const loadCategory = async (categoryName) => {
    const seq = ++categorySeq.current
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      let pageNum = 1
      let all = []
      let hasNext = true
      while (hasNext) {
        const res = await fetch(`${API_BASE}/api/news/?page=${pageNum}`, {
          headers,
        })
        let json
        try {
          json = await res.json()
        } catch (parseErr) {
          break
        }
        if (!res.ok) {
          setError(getErrorMessage(json, 'Gagal memuat berita.'))
          return
        }
        const data = parseResponse(json)
        const results = Array.isArray(data.results) ? data.results : []
        all = all.concat(results)
        hasNext = Boolean(data.next)
        pageNum += 1
      }
      // Abaikan hasil jika user sudah pindah kategori
      if (seq !== categorySeq.current) return
      setNews(all.filter((item) => item.category_name === categoryName))
      setHasMore(false)
      setPage(1)
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNews(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLoadMore = () => {
    if (loadingMore) return
    const nextPage = page + 1
    setPage(nextPage)
    setLoadingMore(true)
    loadNews(nextPage, true)
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header Section: Dark blue top bar with back button and title */}
      <section className="bg-primary w-full sticky top-0 z-20">
        <div className="max-w-md mx-auto flex items-center px-4 py-[14px]">
          {/* Back Button */}
          <button
            type="button"
            onClick={onBackClick}
            className="w-7 h-7 flex items-center justify-center shrink-0 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Back"
          >
            <img src={backIcon} alt="Back" className="w-[18px] h-[18px]" />
          </button>
          {/* Title */}
          <div className="flex-1 text-center pr-7">
            <h1 className="text-white font-medium text-base tracking-wide">
              Lebih Banyak
            </h1>
          </div>
        </div>
      </section>

      {/* Tabs Section: Horizontally scrollable category filters */}
      <section className="bg-white w-full border-b border-borderGray sticky top-[56px] z-10 shadow-sm">
        <div className="max-w-md mx-auto flex items-center px-4 py-[14px] gap-2.5 overflow-x-auto whitespace-nowrap scrollbar-hide">
          {categories.map((category) => {
            const isActive = activeCategory === category
            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setActiveCategory(category)
                  setPage(1)
                  if (category === 'Semua') {
                    loadNews(1)
                  } else {
                    loadCategory(category)
                  }
                }}
                className={`px-4 py-2 rounded-[20px] text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent text-white'
                    : 'bg-[#f2f3f5] text-textGray hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            )
          })}
        </div>
      </section>

      {/* Content Section: Main list of news/articles grouped by category */}
      <section className="w-full min-h-screen pb-8">
        <div className="max-w-md mx-auto px-4 pt-4 space-y-8">
          {loading ? (
            <p className="text-textLight text-sm text-center py-8">
              Memuat berita...
            </p>
          ) : news.length === 0 ? (
            <p className="text-textLight text-sm text-center py-8">
              {activeCategory === 'Semua'
                ? 'Belum ada berita.'
                : `Belum ada berita untuk kategori ${activeCategory}.`}
            </p>
          ) : (
            <div>
              <h2 className="text-textDark font-semibold text-sm mb-3">
                {activeCategory === 'Semua'
                  ? 'Semua Berita'
                  : `Berita ${activeCategory}`}
              </h2>
              <div className="flex flex-col">
                {news.map((item) => (
                  <article
                    key={item.id}
                    onClick={() => onArticleClick(item)}
                    className="flex justify-between items-start py-3 border-b border-borderGray gap-[14px] cursor-pointer hover:bg-gray-50/50 transition-colors rounded-lg -mx-2 px-2"
                  >
                    <div className="flex flex-col gap-[6px] flex-1 pt-1">
                      <h3 className="text-textDark font-medium text-sm leading-snug line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-textLight text-xs">
                        {item.author_name || 'Admin'}
                      </p>
                    </div>
                    {/* Image Thumbnail */}
                    <div className="w-[84px] h-[64px] bg-imageBg border border-imageBorder rounded-lg shrink-0 overflow-hidden">
                      {item.image ? (
                        <img
                          src={`${API_BASE}${item.image}`}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>

              {activeCategory === 'Semua' && hasMore && !loading && (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="mt-6 w-full py-3 rounded-2xl border border-borderGray bg-white text-accent text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  {loadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <ErrorModal
        open={Boolean(error)}
        title="Gagal Memuat Berita"
        message={error}
        onClose={() => setError('')}
      />
    </div>
  )
}

export default NewsPage
