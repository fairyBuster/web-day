import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import backIcon from '../../assets/21_1423.svg'
import bonus1Icon from '../../assets/21_1431.svg'
import bonus2Icon from '../../assets/21_1450.svg'
import bonus3Icon from '../../assets/21_1469.svg'
import bonus4Icon from '../../assets/21_1488.svg'
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

// Format tanggal ISO ke format Indonesia (contoh: 23 Agustus 2026, 09:12)
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

// Format angka tanpa prefix Rp (contoh: 35.000)
const formatAmount = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return num.toLocaleString('id-ID', { maximumFractionDigits: 0 })
}

const bonusIcons = [bonus1Icon, bonus2Icon, bonus3Icon, bonus4Icon]

// Tipe transaksi komisi referral
const COMMISSION_TYPES = ['PROFIT_COMMISSION', 'PURCHASE_COMMISSION']

function RiwayatBonusReferralPage({ onBackClick }) {
  const [transactions, setTransactions] = useState([])
  const [pages, setPages] = useState({
    PROFIT_COMMISSION: 1,
    PURCHASE_COMMISSION: 1,
  })
  const [hasMoreByType, setHasMoreByType] = useState({
    PROFIT_COMMISSION: false,
    PURCHASE_COMMISSION: false,
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
        getErrorMessage(json, `Gagal memuat bonus ${type}.`),
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
        COMMISSION_TYPES.map((type) => fetchType(type, 1)),
      )
      const merged = results.flatMap((r) => r.list)
      merged.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at),
      )
      setTransactions(merged)
      setPages({ PROFIT_COMMISSION: 1, PURCHASE_COMMISSION: 1 })
      setHasMoreByType({
        PROFIT_COMMISSION: results[0].hasMore,
        PURCHASE_COMMISSION: results[1].hasMore,
      })
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
      const typesToLoad = COMMISSION_TYPES.filter((type) => hasMoreByType[type])
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
      <section className="w-full max-w-md mx-auto bg-primary shadow-sm">
        <div className="relative flex items-center justify-center h-14 px-4">
          <button
            type="button"
            onClick={onBackClick}
            className="absolute left-4 flex items-center justify-center w-6 h-6 hover:opacity-80 transition-opacity focus:outline-none"
            aria-label="Go back"
          >
            <img src={backIcon} alt="Back Icon" className="w-4 h-4" />
          </button>
          <h1 className="text-white text-base font-medium tracking-wide">
            Riwayat Bonus Referral
          </h1>
        </div>
      </section>

      {/* List Section */}
      <section className="w-full max-w-md mx-auto bg-white flex flex-col">
        {loading ? (
          <p className="text-textLight text-sm text-center py-10">
            Memuat bonus referral...
          </p>
        ) : transactions.length === 0 ? (
          <p className="text-textLight text-sm text-center py-10">
            Belum ada bonus referral.
          </p>
        ) : (
          transactions.map((item, index) => (
            <div
              key={item.id ?? item.trx_id ?? index}
              className="flex flex-row items-center gap-3 px-4 py-3.5 border-b border-borderGray hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[#fbeed4] flex items-center justify-center shrink-0">
                <img
                  src={bonusIcons[index % bonusIcons.length]}
                  alt="Referral Icon"
                  className="w-4 h-4"
                />
              </div>
              <div className="flex flex-col items-start gap-0.5 flex-1">
                <div className="flex flex-row items-center gap-1.5">
                  <span className="text-textDark text-sm font-medium">
                    Bonus Referral
                  </span>
                  {item.commission_level ? (
                    <span className="bg-[#dbe9fb] text-primary text-[10px] px-1.5 py-0.5 rounded-md font-medium">
                      Level {item.commission_level}
                    </span>
                  ) : null}
                </div>
                {item.upline_phone ? (
                  <span className="text-[#6a6d72] text-xs">
                    dari {item.upline_phone}
                  </span>
                ) : null}
                <span className="text-textLight text-[11px]">
                  {formatDate(item.created_at)}
                </span>
              </div>
              <div className="text-[#2fb380] text-sm font-medium shrink-0">
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
      </section>

      {/* Error Modal */}
      <ErrorModal
        open={Boolean(error)}
        title="Gagal Memuat Bonus Referral"
        message={error}
        onClose={() => setError('')}
      />
    </div>
  )
}

export default RiwayatBonusReferralPage
