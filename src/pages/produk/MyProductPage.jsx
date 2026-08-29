import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import backIcon from '../../assets/13_965.svg'
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

const tabs = ['Aktif', 'Selesai']

// Format angka ke format Indonesia dengan prefix Rp (contoh: Rp1.350.000)
const formatRupiah = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return `Rp0`
  return `Rp${num.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`
}

// Normalisasi format tanggal backend ("YYYY-MM-DD HH:MM:SS" atau ISO "T") → Date
const toDate = (value) => {
  if (!value) return null
  const normalized = String(value).replace(' ', 'T')
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

// Format tanggal API → "12 Agustus 2026" (tanpa jam, sesuai desain kartu)
const formatDate = (dateStr) => {
  const d = toDate(dateStr)
  if (!d) return dateStr || ''
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// product_image bisa berupa URL lengkap atau path relatif
const imageUrl = (path) => {
  if (!path) return ''
  return /^https?:\/\//i.test(path) ? path : `${API_BASE}${path}`
}

// Format durasi countdown (ms) → "HH:MM:SS"
const formatCountdown = (ms) => {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0')
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0')
  const s = String(totalSec % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

const isActive = (status) => (status || '').toUpperCase() === 'ACTIVE'

// Peta status API → label + warna badge
const statusBadge = (status) => {
  const s = (status || '').toUpperCase()
  if (s === 'ACTIVE') {
    return { text: 'Proyek aktif', cls: 'bg-[#e0f3e1] text-[#2fb380]' }
  }
  if (s === 'COMPLETED' || s === 'SUCCESS') {
    return { text: 'Proyek selesai', cls: 'bg-[#e0f3e1] text-[#2fb380]' }
  }
  if (s === 'EXPIRED') {
    return { text: 'Berakhir', cls: 'bg-[#f2f3f5] text-textLight' }
  }
  return { text: 'Dibatalkan', cls: 'bg-[#f2f3f5] text-textLight' }
}

// Hitung progress bar dari durasi dan sisa hari
const progressInfo = (item) => {
  const duration = Number(item.duration_days)
  const remaining = Number(item.remaining_days)
  if (!Number.isFinite(duration) || duration <= 0) {
    return { dayLabel: '-', totalLabel: '-', percent: 0 }
  }
  const passed = Number.isFinite(remaining)
    ? Math.max(0, Math.min(duration, duration - remaining))
    : 0
  return {
    dayLabel: `Hari ke-${Math.round(passed)}`,
    totalLabel: `${duration} Hari`,
    percent: Math.min(100, (passed / duration) * 100),
  }
}

function MyProductPage({ onBackClick }) {
  const [activeTab, setActiveTab] = useState('Aktif')
  const [investments, setInvestments] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())

  // Tick tiap detik supaya countdown "Keuntungan berikutnya" berjalan
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const loadInvestments = async (pageNum, append = false) => {
    if (!append) setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/investments/?page=${pageNum}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      let json
      try {
        json = await res.json()
      } catch (parseErr) {
        setError(
          'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
        )
        return
      }
      const data = parseResponse(json)
      if (!res.ok) {
        setError(getErrorMessage(data, 'Gagal memuat investasi.'))
        return
      }
      // Endpoint bisa balikin {results: [...]} (paginated) atau array polos
      const list = Array.isArray(data.results)
        ? data.results
        : Array.isArray(data)
          ? data
          : []
      setInvestments((prev) => (append ? [...prev, ...list] : list))
      setHasMore(Boolean(data.next) && list.length > 0)
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadInvestments(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLoadMore = () => {
    if (loadingMore) return
    setPage(page + 1)
    setLoadingMore(true)
    loadInvestments(page + 1, true)
  }

  const visibleInvestments = investments.filter((i) =>
    activeTab === 'Aktif' ? isActive(i.status) : !isActive(i.status),
  )
  const totalProject = visibleInvestments.reduce(
    (sum, i) => sum + (Number(i.total_amount) || 0),
    0,
  )
  // Total Bunga = profit yang SUDAH diterima (total_claimed_profit),
  // bukan potensi harian — kalau belum ada klaim, tetap 0
  const totalInterest = visibleInvestments.reduce(
    (sum, i) => sum + (Number(i.total_claimed_profit) || 0),
    0,
  )

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header Section */}
      <section className="w-full max-w-md mx-auto bg-primary shadow-sm">
        <div className="relative flex items-center justify-center h-14 px-4">
          <button
            type="button"
            onClick={onBackClick}
            className="absolute left-4 flex items-center justify-center w-6 h-6 hover:opacity-80 transition-opacity focus:outline-none"
            aria-label="Go back"
          >
            <img src={backIcon} alt="Back Icon" className="w-[18px] h-[18px]" />
          </button>
          <h1 className="text-white text-base font-medium tracking-wide">
            Proyek Saya
          </h1>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="bg-white border-b border-borderGray flex gap-6 px-4 pt-3.5 w-full max-w-md mx-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="flex flex-col items-center relative"
          >
            <span
              className={`text-sm pb-3 ${
                activeTab === tab ? 'text-primary font-medium' : 'text-textLight'
              }`}
            >
              {tab}
            </span>
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 w-full h-[3px] bg-primary rounded-t-sm"></div>
            )}
          </button>
        ))}
      </section>

      {/* Summary Section */}
      <section className="bg-white py-4 px-4 flex justify-center items-center w-full max-w-md mx-auto">
        <div className="flex flex-col items-center px-10 border-r border-background">
          <span className="text-textLight text-[11px] mb-1">Total Proyek</span>
          <span className="text-primary font-bold text-sm">
            {loading ? '-' : formatRupiah(totalProject)}
          </span>
        </div>
        <div className="flex flex-col items-center px-10">
          <span className="text-textLight text-[11px] mb-1">Total Bunga</span>
          <span className="text-primary font-bold text-sm">
            {loading ? '-' : formatRupiah(totalInterest)}
          </span>
        </div>
      </section>

      {/* Projects Section */}
      <section className="bg-background p-4 min-h-screen flex flex-col gap-3.5 w-full max-w-md mx-auto">
        {loading ? (
          <p className="text-textLight text-sm text-center py-8">
            Memuat proyek...
          </p>
        ) : visibleInvestments.length === 0 ? (
          <p className="text-textLight text-sm text-center py-8">
            {activeTab === 'Aktif'
              ? 'Belum ada proyek aktif.'
              : 'Belum ada proyek selesai.'}
          </p>
        ) : (
          <>
            {visibleInvestments.map((item) => {
              const badge = statusBadge(item.status)
              const progress = progressInfo(item)
              const claimDate = toDate(
                item.next_claim_time || item.next_claim_time_calculated,
              )
              const countdown = claimDate
                ? formatCountdown(claimDate.getTime() - now)
                : '-'
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-[14px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)] flex flex-col gap-3.5"
                >
                  {/* Card Header */}
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 bg-imageBg border border-imageBorder rounded-[10px] shrink-0 overflow-hidden">
                      {item.product_image ? (
                        <img
                          src={imageUrl(item.product_image)}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 flex flex-col justify-center h-14 min-w-0">
                      <h2 className="text-textDark font-semibold text-sm truncate">
                        {item.product_name || '-'}
                      </h2>
                      <p className="text-textLight text-[11px] mt-0.5 truncate">
                        {item.created_at
                          ? `Proyek terdaftar ${formatDate(item.created_at)}`
                          : ''}
                      </p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-md mt-1 shrink-0 ${badge.cls}`}>
                      <span className="text-[10px] font-medium">
                        {badge.text}
                      </span>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="flex justify-between border-t border-b border-borderGray py-3">
                    <div className="flex flex-col items-center w-1/3">
                      <span className="text-textLight text-[10px] mb-1">
                        Proyek
                      </span>
                      <span className="text-textDark font-semibold text-xs">
                        {formatRupiah(item.total_amount)}
                      </span>
                    </div>
                    <div className="flex flex-col items-center w-1/3">
                      <span className="text-textLight text-[10px] mb-1">
                        Perkiraan Bunga Harian
                      </span>
                      <span className="text-[#d6392c] font-semibold text-xs">
                        {formatRupiah(item.daily_profit)}
                      </span>
                    </div>
                    <div className="flex flex-col items-center w-1/3">
                      <span className="text-textLight text-[10px] mb-1">
                        Sisa Waktu
                      </span>
                      <span className="text-textDark font-semibold text-xs">
                        {Number.isFinite(Number(item.remaining_days))
                          ? `${item.remaining_days} Hari`
                          : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex flex-col gap-1.5 mt-1">
                    <div className="flex justify-between text-[10px] text-textLight">
                      <span>{progress.dayLabel}</span>
                      <span>{progress.totalLabel}</span>
                    </div>
                    <div className="h-1.5 bg-background rounded-full w-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${progress.percent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Countdown */}
                  <div className="bg-background rounded-full py-2.5 flex justify-center items-center gap-2 mt-1">
                    {isActive(item.status) ? (
                      <>
                        <span className="text-[#6a6d72] text-[11px]">
                          Keuntungan berikutnya dalam
                        </span>
                        <span className="text-primary font-bold text-[11px]">
                          {countdown}
                        </span>
                      </>
                    ) : (
                      <span className="text-[#6a6d72] text-[11px]">
                        Proyek telah selesai
                      </span>
                    )}
                  </div>
                </div>
              )
            })}

            {hasMore && !loading && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="mt-2 py-3 rounded-2xl border border-borderGray bg-white text-accent text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                {loadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
              </button>
            )}
          </>
        )}
      </section>

      {/* Error Modal */}
      <ErrorModal
        open={Boolean(error)}
        title="Gagal Memuat Investasi"
        message={error}
        onClose={() => setError('')}
      />
    </div>
  )
}

export default MyProductPage
