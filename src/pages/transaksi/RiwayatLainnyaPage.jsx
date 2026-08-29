import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import backIcon from '../../assets/21_1867.svg'
import misiIcon from '../../assets/21_1875.svg'
import absenIcon from '../../assets/21_1886.svg'
import rouletteIcon from '../../assets/21_1898.svg'
import saldoIcon from '../../assets/21_1935.svg'
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

// Format tanggal ISO ke format Indonesia (contoh: 22 Agustus 2026, 10:20)
const formatDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const date = d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const time = d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${date}, ${time}`
}

// Format angka tanpa prefix Rp (contoh: 8.500)
const formatAmount = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return num.toLocaleString('id-ID', { maximumFractionDigits: 0 })
}

// Tipe transaksi yang ditampilkan di "Riwayat Lainnya"
const OTHER_TYPES = [
  'CREDIT',
  'DEBIT',
  'MISSIONS',
  'REJECT',
  'ATTENDANCE',
  'VOUCHER',
]

// Judul per tipe (sesuai desain)
const TYPE_TITLE = {
  MISSIONS: 'Reward Misi Harian',
  ATTENDANCE: 'Reward Absen Harian',
  REJECT: 'Transaksi Ditolak',
  VOUCHER: 'Reward Voucher',
  CREDIT: 'Menambahkan Saldo',
  DEBIT: 'Pengurangan Saldo',
}

const otherIcons = [misiIcon, absenIcon, rouletteIcon, saldoIcon]

function RiwayatLainnyaPage({ onBackClick }) {
  const [transactions, setTransactions] = useState([])
  const [pages, setPages] = useState({
    CREDIT: 1,
    DEBIT: 1,
    MISSIONS: 1,
    REJECT: 1,
    ATTENDANCE: 1,
    VOUCHER: 1,
  })
  const [hasMoreByType, setHasMoreByType] = useState({
    CREDIT: false,
    DEBIT: false,
    MISSIONS: false,
    REJECT: false,
    ATTENDANCE: false,
    VOUCHER: false,
  })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const hasMore = Object.values(hasMoreByType).some(Boolean)

  const fetchType = async (type, pageNum) => {
    const token = localStorage.getItem('access_token')
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
    const res = await fetch(
      `${API_BASE}/api/transactions/?type=${type}&page=${pageNum}`,
      { headers },
    )
    let json
    try {
      json = await res.json()
    } catch (parseErr) {
      return { list: [], hasMore: false }
    }
    if (!res.ok) {
      setError(
        getErrorMessage(json, `Gagal memuat transaksi ${type}.`),
      )
      return { list: [], hasMore: false }
    }
    const data = parseResponse(json)
    const list = Array.isArray(data.results)
      ? data.results
      : Array.isArray(data)
        ? data
        : []
    return { list, hasMore: Boolean(data.next) && list.length > 0 }
  }

  const loadTransactions = async () => {
    setLoading(true)
    setError('')
    try {
      const results = await Promise.all(
        OTHER_TYPES.map((type) => fetchType(type, 1)),
      )
      const merged = results.flatMap((r) => r.list)
      merged.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      )
      setTransactions(merged)
      const nextPages = {}
      const nextHasMore = {}
      OTHER_TYPES.forEach((type, i) => {
        nextPages[type] = 1
        nextHasMore[type] = results[i].hasMore
      })
      setPages(nextPages)
      setHasMoreByType(nextHasMore)
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLoadMore = async () => {
    if (loadingMore) return
    setLoadingMore(true)
    setError('')
    try {
      const typesToLoad = OTHER_TYPES.filter((type) => hasMoreByType[type])
      const results = await Promise.all(
        typesToLoad.map((type) => fetchType(type, pages[type] + 1)),
      )
      const newPages = { ...pages }
      const newHasMore = { ...hasMoreByType }
      results.forEach((r, i) => {
        const type = typesToLoad[i]
        newPages[type] = pages[type] + 1
        newHasMore[type] = r.hasMore
      })
      setPages(newPages)
      setHasMoreByType(newHasMore)
      const merged = [...transactions, ...results.flatMap((r) => r.list)]
      merged.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      )
      setTransactions(merged)
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header Section */}
      <section className="bg-background w-full flex justify-center">
        <div className="w-full max-w-md bg-primary text-white px-4 h-14 flex items-center relative shadow-sm">
          <button
            type="button"
            onClick={onBackClick}
            className="p-2 -ml-2 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
            aria-label="Go back"
          >
            <img src={backIcon} alt="" className="w-[18px] h-[18px]" />
          </button>
          <h1 className="text-[16px] font-semibold absolute left-1/2 -translate-x-1/2 tracking-wide">
            Riwayat Lainnya
          </h1>
        </div>
      </section>

      {/* History List Section */}
      <section className="bg-background w-full min-h-screen pb-10 flex justify-center">
        <div className="w-full max-w-md bg-white flex flex-col shadow-sm">
          {loading ? (
            <p className="text-textLight text-sm text-center py-10">
              Memuat riwayat...
            </p>
          ) : transactions.length === 0 ? (
            <p className="text-textLight text-sm text-center py-10">
              Belum ada riwayat transaksi.
            </p>
          ) : (
            transactions.map((item, index) => {
              const isPositive = Number(item.amount) >= 0
              return (
                <div
                  key={item.id ?? item.trx_id ?? index}
                  className="flex items-center justify-between px-4 py-[14px] border-b border-borderGray last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#f3ddf0] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <img
                        src={otherIcons[index % otherIcons.length]}
                        alt=""
                        className="w-[18px] h-[18px]"
                      />
                    </div>
                    <div className="flex flex-col gap-[3px]">
                      <span className="text-[14px] font-medium text-textDark leading-tight">
                        {TYPE_TITLE[item.type] || item.type || 'Transaksi'}
                      </span>
                      <span className="text-[12px] text-textLight leading-tight">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[14px] font-semibold ${
                      isPositive ? 'text-[#2fb380]' : 'text-[#d6392c]'
                    }`}
                  >
                    {isPositive ? '+' : '-'}Rp
                    {formatAmount(Math.abs(Number(item.amount) || 0))}
                  </span>
                </div>
              )
            })
          )}

          {hasMore && !loading && (
            <div className="flex justify-center py-4">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="bg-primary text-white text-sm font-medium px-6 py-2.5 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Error Modal */}
      <ErrorModal
        open={Boolean(error)}
        title="Gagal Memuat Riwayat"
        message={error}
        onClose={() => setError('')}
      />
    </div>
  )
}

export default RiwayatLainnyaPage
