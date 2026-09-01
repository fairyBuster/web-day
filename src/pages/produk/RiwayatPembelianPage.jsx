import { useEffect, useMemo, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import backIcon from '../../assets/13_1073.svg'
import searchIcon from '../../assets/13_1089.svg'
import filterIcon from '../../assets/13_1096.svg'
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

const tabs = ['Semua', 'Aktif', 'Selesai']

// Format angka ke format Indonesia dengan prefix Rp (contoh: Rp2.850.000)
// product_image bisa berupa URL lengkap atau path relatif
const imageUrl = (path) => {
  if (!path) return ''
  return /^https?:\/\//i.test(path) ? path : `${API_BASE}${path}`
}

// Gambar produk: dari transaksi, atau join dari daftar produk (by id / by name)
const productImageOf = (item, images) => {
  if (item.product_image || item.image) return item.product_image || item.image
  if (item.product_id != null && images.byId?.[item.product_id]) {
    return images.byId[item.product_id]
  }
  if (item.product_name && images.byName?.[item.product_name]) {
    return images.byName[item.product_name]
  }
  return ''
}

const formatPrice = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return `Rp${String(value)}`
  return `Rp${num.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

// Peta status API → label Indonesia + apakah masih aktif (badge hijau)
const statusInfo = (status) => {
  const s = (status || '').toUpperCase()
  const labels = {
    ACTIVE: 'Sedang berlangsung',
    PENDING: 'Menunggu',
    COMPLETED: 'Selesai',
    SUCCESS: 'Selesai',
    REJECTED: 'Ditolak',
    REJECT: 'Ditolak',
    CANCELLED: 'Dibatalkan',
    CANCEL: 'Dibatalkan',
  }
  const active = !/COMPLETED|SUCCESS|REJECT|CANCEL|DONE|SETTLED/i.test(s)
  return { active, label: labels[s] || status || '-' }
}

// Normalisasi format tanggal backend ("YYYY-MM-DD HH:MM:SS" atau ISO "T") → Date
const toDate = (value) => {
  if (!value) return null
  const normalized = String(value).replace(' ', 'T')
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

// Format tanggal API → "12 Agustus 2026, 14:22"
const formatDate = (dateStr) => {
  const d = toDate(dateStr)
  if (!d) return dateStr || ''
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

// Status investasi asli (investment_status) diprioritaskan — transaksi
// pembayaran INVESTMENTS selalu COMPLETED, tapi investasinya bisa aktif
const trxStatus = (item) =>
  statusInfo(item.investment_status || item.status)

// Label dompet API → bahasa Indonesia (contoh: BALANCE_DEPOSIT → Dompet isi ulang)
const walletLabel = (type) => {
  const labels = {
    BALANCE: 'Saldo utama',
    BALANCE_DEPOSIT: 'Dompet isi ulang',
    BALANCE_HOLD: 'Saldo terkunci',
    BALANCE_CASHBACK: 'Saldo cashback',
  }
  return labels[type] || type || '-'
}

function RiwayatPembelianPage({ onBackClick, onDetailClick }) {
  const [activeTab, setActiveTab] = useState('Semua')
  const [search, setSearch] = useState('')
  const [transactions, setTransactions] = useState([])
  // Total Bunga Didapat = profit yang SUDAH diterima (total_claimed_profit),
  // dijumlahkan dari /api/investments/ — sumber data yang sama dengan MyProduct
  const [totalInterest, setTotalInterest] = useState(0)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [productImages, setProductImages] = useState({ byId: {}, byName: {} })

  // Ambil daftar produk sebagai sumber gambar (transaksi tidak menyimpan gambar)
  useEffect(() => {
    let active = true
    const token = localStorage.getItem('access_token')
    fetch(`${API_BASE}/api/products/`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active || !json) return
        const data = parseResponse(json)
        const list = Array.isArray(data.results) ? data.results : []
        const byId = {}
        const byName = {}
        for (const prod of list) {
          const img = prod.image || prod.product_image || ''
          if (!img) continue
          if (prod.id != null) byId[prod.id] = img
          const name = prod.name || prod.product_name
          if (name) byName[name] = img
        }
        setProductImages({ byId, byName })
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const loadTransactions = async (pageNum, append = false) => {
    if (!append) setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(
        `${API_BASE}/api/transactions/?type=INVESTMENTS&page=${pageNum}`,
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
        setError(getErrorMessage(data, 'Gagal memuat riwayat pembelian.'))
        return
      }
      // Endpoint bisa balikin {results: [...]} (paginated) atau array polos
      const list = Array.isArray(data.results)
        ? data.results
        : Array.isArray(data)
          ? data
          : []
      setTransactions((prev) => (append ? [...prev, ...list] : list))
      if (!append) setCount(Number(data.count) || 0)
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

  // Total bunga dihitung dari semua halaman investasi (bukan hanya yang tampil)
  useEffect(() => {
    let active = true
    const loadAllInvestments = async () => {
      try {
        const token = localStorage.getItem('access_token')
        let pageNum = 1
        let sum = 0
        for (;;) {
          const res = await fetch(
            `${API_BASE}/api/investments/?page=${pageNum}`,
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
            return
          }
          const data = parseResponse(json)
          if (!res.ok) return
          const list = Array.isArray(data.results)
            ? data.results
            : Array.isArray(data)
              ? data
              : []
          sum += list.reduce(
            (acc, item) => acc + (Number(item.total_claimed_profit) || 0),
            0,
          )
          if (!data.next || list.length === 0) break
          pageNum += 1
        }
        if (active) setTotalInterest(sum)
      } catch (err) {
        // Gagal memuat — biarkan total tetap 0
      }
    }
    loadAllInvestments()
    return () => {
      active = false
    }
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

  // Filter tab (Aktif/Selesai) + pencarian (nama produk / ID transaksi)
  const filtered = useMemo(() => {
    let list = transactions
    if (activeTab === 'Aktif') {
      list = list.filter((t) => trxStatus(t).active)
    }
    if (activeTab === 'Selesai') {
      list = list.filter((t) => !trxStatus(t).active)
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (t) =>
          (t.product_name || '').toLowerCase().includes(q) ||
          (t.transaction_id || t.trx_id || '').toLowerCase().includes(q),
      )
    }
    return [...list].sort((a, b) => {
      const da = toDate(a.created_at)
      const db = toDate(b.created_at)
      return (db ? db.getTime() : 0) - (da ? da.getTime() : 0)
    })
  }, [transactions, activeTab, search])

  // Kelompokkan per bulan (dari created_at)
  const groups = useMemo(() => {
    const map = {}
    for (const trx of filtered) {
      const key = (trx.created_at || '').slice(0, 7) // YYYY-MM
      if (!map[key]) map[key] = []
      map[key].push(trx)
    }
    return Object.keys(map)
      .sort()
      .reverse()
      .map((key) => ({
        month: new Date(`${key}-01T00:00:00`).toLocaleDateString('id-ID', {
          month: 'long',
          year: 'numeric',
        }),
        items: map[key],
      }))
  }, [filtered])

  const totalAmount = transactions.reduce(
    (sum, t) => sum + (Number(t.amount) || 0),
    0,
  )

  const stats = [
    { label: 'Total Transaksi', value: String(count) },
    { label: 'Total Proyek', value: formatPrice(totalAmount) },
    { label: 'Total Bunga Didapat', value: formatPrice(totalInterest) },
  ]

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header Section */}
      <section className="max-w-md mx-auto">
        <div className="bg-primary text-white sticky top-0 z-20">
          <div className="flex items-center px-4 py-4 relative h-14">
            <button
              type="button"
              onClick={onBackClick}
              className="absolute left-4 flex items-center justify-center w-6 h-6 hover:opacity-80 transition-opacity"
            >
              <img src={backIcon} alt="Back" className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold w-full text-center">
              Riwayat Pembelian
            </h1>
          </div>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="max-w-md mx-auto bg-white border-b border-borderGray">
        <div className="flex gap-2 px-4 py-3 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-primary text-white'
                  : 'bg-borderGray text-textGray hover:bg-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {/* Search & Stats Section */}
      <section className="max-w-md mx-auto bg-white px-4 py-4 flex flex-col gap-5 shadow-sm">
        <div className="flex gap-2">
          <div className="flex-1 bg-borderGray rounded-lg flex items-center px-3.5 py-2.5 gap-2 focus-within:ring-1 focus-within:ring-primary transition-shadow">
            <img src={searchIcon} alt="Search" className="w-4 h-4 opacity-70" />
            <input
              type="text"
              placeholder="Cari proyek saya"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-textGray placeholder-textLight"
            />
          </div>
          <button
            type="button"
            className="bg-borderGray w-10 h-10 rounded-lg flex items-center justify-center shrink-0 hover:bg-gray-200 transition-colors"
          >
            <img src={filterIcon} alt="Filter" className="w-[18px] h-[18px]" />
          </button>
        </div>

        <div className="flex justify-between items-center py-1">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`flex flex-col items-center flex-1 px-1 ${
                index < stats.length - 1 ? 'border-r border-borderGray' : ''
              }`}
            >
              <span className="text-textLight text-[10px] mb-1 text-center">
                {stat.label}
              </span>
              <span className="text-primary text-sm font-bold">{stat.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* List Section */}
      <section className="max-w-md mx-auto bg-background px-4 py-5 flex flex-col gap-5 pb-10">
        {loading ? (
          <div className="bg-white rounded-[14px] p-8 text-center text-textGray text-sm">
            Memuat riwayat pembelian...
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-[14px] p-8 text-center text-textGray text-sm">
            Belum ada transaksi investasi.
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.month} className="flex flex-col gap-3">
              <h2 className="text-textLight text-xs font-medium px-1">
                {group.month}
              </h2>

              {group.items.map((item, index) => {
                const status = trxStatus(item)
                const details = [
                  {
                    label: 'Jumlah Proyek',
                    value: formatPrice(item.amount),
                  },
                  {
                    label: 'Kuantitas',
                    value: `${item.investment_quantity ?? 1}x`,
                  },
                  {
                    label: 'Status',
                    value: status.label,
                  },
                  {
                    label: 'Sumber Dana',
                    value: walletLabel(item.wallet_type),
                  },
                ]
                return (
                  <div
                    key={item.id || item.transaction_id || item.trx_id || index}
                    className="bg-white rounded-[14px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)] flex flex-col gap-4"
                  >
                    {/* Card Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        <div className="w-[50px] h-[50px] bg-imageBg border border-imageBorder rounded-lg shrink-0 overflow-hidden">
                          {productImageOf(item, productImages) ? (
                            <ApiImage
                              src={imageUrl(productImageOf(item, productImages))}
                              alt={item.product_name || 'Produk'}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="flex flex-col justify-center gap-0.5">
                          <h3 className="text-textDark text-sm font-bold">
                            {item.product_name || 'Produk'}
                          </h3>
                          <span className="text-textLight text-[11px]">
                            ID: {item.transaction_id || item.trx_id || '-'}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-medium px-2.5 py-1 rounded-md mt-1 ${
                          status.active
                            ? 'bg-[#e0f3e1] text-[#2fb380]'
                            : 'bg-background text-[#6a6d72]'
                        }`}
                      >
                        {status.label}
                      </span>
                    </div>

                    {/* Card Details Grid */}
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 py-3 border-y border-borderGray">
                      {details.map((detail) => (
                        <div key={detail.label} className="flex flex-col gap-1">
                          <span className="text-textLight text-[10px]">
                            {detail.label}
                          </span>
                          <span className="text-xs font-bold text-textDark">
                            {detail.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Card Footer */}
                    <div className="flex justify-between items-center pt-0.5">
                      <span className="text-textLight text-[10px]">
                        {formatDate(item.created_at)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDetailClick?.(item)}
                        className="text-primary text-xs font-bold hover:underline"
                      >
                        Lihat Detail
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}

        {hasMore && !loading && (
          <div className="flex justify-center pt-2">
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
        title="Gagal Memuat Riwayat"
        message={error}
        onClose={() => setError('')}
      />
    </div>
  )
}

export default RiwayatPembelianPage
