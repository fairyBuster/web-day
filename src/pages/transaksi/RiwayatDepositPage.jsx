import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import backIcon from '../../assets/21_1285.svg'
import deposit1Icon from '../../assets/21_1293.svg'
import deposit2Icon from '../../assets/21_1305.svg'
import deposit3Icon from '../../assets/21_1317.svg'
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

// Format tanggal ISO ke format Indonesia (contoh: 22 Agustus 2026, 08:15)
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

// Format angka tanpa prefix Rp (contoh: 350.000)
const formatAmount = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return num.toLocaleString('id-ID', { maximumFractionDigits: 0 })
}

const depositIcons = [deposit1Icon, deposit2Icon, deposit3Icon]

function RiwayatDepositPage({ onBackClick }) {
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
        `${API_BASE}/api/deposits/transactions/?page=${pageNum}`,
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
        setError(getErrorMessage(data, 'Gagal memuat riwayat deposit.'))
        return
      }
      const list = Array.isArray(data.results)
        ? data.results
        : Array.isArray(data)
          ? data
          : []
      // Tampilkan hanya deposit yang statusnya COMPLETED/SUCCESS (selesai)
      const completed = list.filter((t) =>
        /^(COMPLETED|SUCCESS)$/i.test(
          String(t.status ?? t.transaction_status ?? '').trim(),
        ),
      )
      setTransactions((prev) => (append ? [...prev, ...completed] : completed))
      setPage(pageNum)
      setHasMore(Boolean(data.next) && completed.length > 0)
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
      <section className="bg-background">
        <div className="max-w-md mx-auto bg-primary relative flex items-center justify-center p-4">
          <button
            type="button"
            onClick={onBackClick}
            className="absolute left-4 w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity"
            aria-label="Go back"
          >
            <img src={backIcon} alt="Back" className="w-[18px] h-[18px]" />
          </button>
          <h1 className="text-white font-semibold text-base tracking-wide">
            Riwayat Deposit
          </h1>
        </div>
      </section>

      {/* History List Section */}
      <section className="bg-background min-h-screen pb-10">
        <div className="max-w-md mx-auto bg-white flex flex-col pt-2 pb-4 shadow-sm min-h-screen">
          {loading ? (
            <p className="text-textLight text-sm text-center py-10">
              Memuat riwayat deposit...
            </p>
          ) : transactions.length === 0 ? (
            <p className="text-textLight text-sm text-center py-10">
              Belum ada riwayat deposit.
            </p>
          ) : (
            transactions.map((item, index) => (
              <div
                key={item.id ?? item.trx_id ?? index}
                className="flex items-center px-4 py-[14px] border-b border-borderGray gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-[#e0f3e1] flex items-center justify-center shrink-0">
                  <img
                    src={depositIcons[index % depositIcons.length]}
                    alt="Deposit Icon"
                    className="w-[18px] h-[18px]"
                  />
                </div>
                <div className="flex flex-col flex-1 gap-[3px]">
                  <h2 className="text-textDark font-medium text-sm">
                    Isi Ulang
                  </h2>
                  <p className="text-textLight text-xs">
                    {formatDate(item.created_at)}
                  </p>
                </div>
                <div className="text-[#2fb380] font-semibold text-sm">
                  +Rp{formatAmount(item.amount)}
                </div>
              </div>
            ))
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
        title="Gagal Memuat Riwayat Deposit"
        message={error}
        onClose={() => setError('')}
      />
    </div>
  )
}

export default RiwayatDepositPage
