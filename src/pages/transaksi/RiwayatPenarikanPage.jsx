import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import backIcon from '../../assets/21_1660.svg'
import bcaIcon from '../../assets/51_86.svg'
import mandiriIcon from '../../assets/51_89.svg'
import bca2Icon from '../../assets/51_92.svg'
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

// Format tanggal ISO ke format Indonesia (contoh: 22 Agustus 2026, 17:03)
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

// Format angka tanpa prefix Rp (contoh: 500.000)
const formatAmount = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return num.toLocaleString('id-ID', { maximumFractionDigits: 0 })
}

// Mask nomor rekening: "1234567890" → "•••7890"
const maskAccount = (num) => {
  const s = String(num || '')
  return s.length > 4 ? `•••${s.slice(-4)}` : s
}

// Peta status withdraw API → label Indonesia + warna
const WITHDRAW_STATUS = {
  COMPLETED: { label: 'Berhasil', color: 'text-[#2fb380]' },
  SUCCESS: { label: 'Berhasil', color: 'text-[#2fb380]' },
  PROCESSING: { label: 'Diproses', color: 'text-[#3a9fd6]' },
  PENDING: { label: 'Pending', color: 'text-[#d6a13a]' },
  REJECTED: { label: 'Ditolak', color: 'text-[#d6392c]' },
  REJECT: { label: 'Ditolak', color: 'text-[#d6392c]' },
  FAILED: { label: 'Ditolak', color: 'text-[#d6392c]' },
  CANCELLED: { label: 'Dibatalkan', color: 'text-[#d6392c]' },
  CANCEL: { label: 'Dibatalkan', color: 'text-[#d6392c]' },
}
const getStatus = (status) =>
  WITHDRAW_STATUS[(status || '').toUpperCase()] || {
    label: status || '-',
    color: 'text-textGray',
  }

const withdrawIcons = [bcaIcon, mandiriIcon, bca2Icon]

function RiwayatPenarikanPage({ onBackClick }) {
  const [transactions, setTransactions] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const loadTransactions = async (pageNum, append = false) => {
    if (!append) setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(
        `${API_BASE}/api/withdraw/transactions/?page=${pageNum}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      )
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
        setError(getErrorMessage(data, 'Gagal memuat riwayat penarikan.'))
        return
      }
      const list = Array.isArray(data.results)
        ? data.results
        : Array.isArray(data)
          ? data
          : []
      setTransactions((prev) => (append ? [...prev, ...list] : list))
      setPage(pageNum)
      setHasMore(Boolean(data.next) && list.length > 0)
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLoadMore = async () => {
    if (loadingMore) return
    setLoadingMore(true)
    try {
      await loadTransactions(page + 1, true)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header Section */}
      <section className="bg-background flex justify-center">
        <div className="w-full max-w-md bg-primary relative flex items-center justify-center h-14 px-4 shadow-sm">
          <button
            type="button"
            onClick={onBackClick}
            className="absolute left-4 flex items-center justify-center w-6 h-6 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Go back"
          >
            <img src={backIcon} alt="Back" className="w-[18px] h-[18px]" />
          </button>
          <h1 className="text-white font-semibold text-[15px] tracking-wide">
            Riwayat Penarikan
          </h1>
        </div>
      </section>

      {/* History Section */}
      <section className="bg-background min-h-screen pb-10 flex justify-center">
        <div className="w-full max-w-md bg-white flex flex-col pt-2 pb-4 px-4 shadow-sm">
          {loading ? (
            <p className="text-textLight text-sm text-center py-10">
              Memuat riwayat penarikan...
            </p>
          ) : transactions.length === 0 ? (
            <p className="text-textLight text-sm text-center py-10">
              Belum ada riwayat penarikan.
            </p>
          ) : (
            transactions.map((item, index) => {
              const status = getStatus(item.status)
              const title = item.bank_name
                ? `Penarikan ke ${item.bank_name} ${maskAccount(item.bank_account_number)}`
                : 'Penarikan'
              return (
                <div
                  key={item.id ?? item.trx_id ?? index}
                  className="flex flex-row items-center py-[14px] border-b border-borderGray last:border-b-0 gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#fbe0dd] flex items-center justify-center shrink-0">
                    <img
                      src={withdrawIcons[index % withdrawIcons.length]}
                      alt="Withdrawal"
                      className="w-4 h-4"
                    />
                  </div>
                  <div className="flex flex-col flex-grow justify-center">
                    <p className="text-textDark text-[13px] font-semibold leading-tight mb-1">
                      {title}
                    </p>
                    <div className="flex flex-row items-center text-[11px]">
                      <span className="text-textLight">
                        {formatDate(item.created_at)}
                      </span>
                      <span className={`ml-1 font-medium ${status.color}`}>
                        · {status.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-[#d6392c] text-[13px] font-semibold shrink-0">
                    -Rp{formatAmount(Math.abs(Number(item.amount) || 0))}
                  </div>
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
        title="Gagal Memuat Riwayat Penarikan"
        message={error}
        onClose={() => setError('')}
      />
    </div>
  )
}

export default RiwayatPenarikanPage
