import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import logoImg from '../../assets/6599a1a542c3a2fd08343a2ebac01e9ee2c2e144.png'
import heroBanner from '../../assets/fc43efe1304ecf9a27f781e3a72446d3f17e7100.png'
import back1Img from '../../assets/back1.png'
import back2Img from '../../assets/back2.png'
import promoBanner from '../../assets/354802d910f64c09f2d2abd6ea12542244cbc277.png'
import rumahIcon from '../../assets/9_752.svg'
import proyekIcon from '../../assets/9_758.svg'
import timIcon from '../../assets/9_764.svg'
import akuIcon from '../../assets/9_772.svg'
import BottomNav from '../../components/BottomNav'
import ErrorModal from '../../components/ErrorModal'
import ApiImage from '../../components/ApiImage'

const navIcons = {
  home: rumahIcon,
  proyek: proyekIcon,
  tim: timIcon,
  aku: akuIcon,
}

const heroBanners = [heroBanner, back1Img, back2Img]

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

// Format angka ke format Indonesia (contoh: 1.350.000,00)
const formatPrice = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return num.toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Estimasi bunga mengikuti profit_type dari API
const formatProfit = (product) => {
  if (product.profit_type === 'percentage') return `${product.profit_rate}%`
  return `${formatPrice(product.profit_rate)} IDR`
}

// Ketersediaan mengikuti stock_enabled dari API
const availabilityText = (product) => {
  if (!product.stock_enabled) return 'Tak terbatas'
  if (product.stock > 0) return `${product.stock} Tersedia`
  return 'Habis'
}

function ProdukPage({
  onNavigate,
  onBeliClick,
  onRiwayatClick,
  onInviteClick,
  onMyProductClick,
}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [bannerIndex, setBannerIndex] = useState(0)
  const [claimedProfit, setClaimedProfit] = useState(null) // null = belum termuat
  const [stats, setStats] = useState(null) // null = belum termuat

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true)
      setError('')
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`${API_BASE}/api/products/`, {
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
          setError(getErrorMessage(data, 'Gagal memuat daftar produk.'))
          return
        }
        setProducts(
          (Array.isArray(data.results) ? data.results : [])
            // Produk termurah tampil paling atas (harga naik)
            .sort((a, b) => Number(a.price) - Number(b.price)),
        )
      } catch (err) {
        setError(
          'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
        )
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Auto-slide banner hero
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % heroBanners.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  // Ambil total profit yang sudah diterima (semua investasi, awal sampai akhir)
  // dari account-info → field total_claimed_profit
  useEffect(() => {
    const loadClaimedProfit = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`${API_BASE}/api/auth/account-info/`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        if (!res.ok) return
        let json
        try {
          json = await res.json()
        } catch (parseErr) {
          return
        }
        const data = parseResponse(json)
        if (data && data.total_claimed_profit !== undefined)
          setClaimedProfit(Number(data.total_claimed_profit))
      } catch (err) {
        // Abaikan — tetap tampil 0
      }
    }
    loadClaimedProfit()
  }, [])

  // Ambil total nominal produk yang sedang dimiliki (investasi aktif)
  // dari balance-statistics/all-time → jumlah total_amount di active_products
  useEffect(() => {
    const loadStats = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(
          `${API_BASE}/api/auth/balance-statistics/all-time/`,
          {
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        )
        if (!res.ok) return
        let json
        try {
          json = await res.json()
        } catch (parseErr) {
          return
        }
        const data = parseResponse(json)
        if (data && Array.isArray(data.active_products)) {
          const total = data.active_products.reduce(
            (sum, p) => sum + (Number(p.total_amount) || 0),
            0,
          )
          setStats(total)
        }
      } catch (err) {
        // Abaikan — tetap tampil 0
      }
    }
    loadStats()
  }, [])

  return (
    <div className="min-h-screen bg-background font-sans pb-24">
      {/* Header Section */}
      <section className="max-w-md mx-auto bg-primary px-4 py-3.5 flex items-center sticky top-0 z-10">
        <img src={logoImg} alt="Logo" className="w-8 h-8" />
        <div className="flex-1 text-center pr-8">
          <h1 className="text-white font-medium text-lg">Produk</h1>
        </div>
      </section>

      {/* Hero Section */}
      <section className="max-w-md mx-auto bg-white">
        <div className="relative w-full h-[206px] overflow-hidden">
          {heroBanners.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={`Hero Banner ${i + 1}`}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                i === bannerIndex ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-center gap-1.5 py-3">
          {heroBanners.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Banner ${i + 1}`}
              onClick={() => setBannerIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === bannerIndex ? 'bg-primary' : 'bg-[#d6d9de]'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Promo Section */}
      <section className="max-w-md mx-auto bg-background px-4 py-4">
        <button
          type="button"
          onClick={() => onInviteClick?.()}
          className="w-full block rounded-xl overflow-hidden cursor-pointer"
          aria-label="Promo undang teman"
        >
          <img
            src={promoBanner}
            alt="Promo Banner"
            className="w-full rounded-xl object-cover"
          />
        </button>
      </section>

      {/* History Section */}
      <section className="max-w-md mx-auto bg-background px-4 pb-4">
        <button
          type="button"
          onClick={() => onRiwayatClick?.()}
          className="inline-block bg-primary text-white px-5 py-2 rounded-full text-sm mb-4 hover:bg-blue-900 transition-colors"
        >
          Riwayat Pembelian
        </button>

        <div className="bg-white rounded-xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-end">
            <div className="space-y-4">
              <div>
                <p className="text-[#6a6d72] text-xs mb-1">
                  Total proyek saya saat ini
                </p>
                <p className="text-primary font-bold text-xl leading-none">
                  {stats !== null
                    ? stats.toLocaleString('id-ID', {
                        maximumFractionDigits: 0,
                      })
                    : '0'}{' '}
                  <span className="text-[#6a6d72] text-xs font-normal">IDR</span>
                </p>
              </div>
              <div>
                <p className="text-[#6a6d72] text-xs mb-1">
                  Bunga sudah dikumpulkan
                </p>
                <p className="text-primary font-bold text-xl leading-none">
                  {claimedProfit !== null
                    ? claimedProfit.toLocaleString('id-ID', {
                        maximumFractionDigits: 0,
                      })
                    : '0'}{' '}
                  <span className="text-[#6a6d72] text-xs font-normal">IDR</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onMyProductClick?.()}
              className="bg-primary text-white px-6 py-2 rounded-full text-sm hover:bg-blue-900 transition-colors"
            >
              Melihat
            </button>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="max-w-md mx-auto bg-background px-4 space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl p-8 text-center text-textGray text-sm">
            Memuat produk...
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-textGray text-sm">
            Belum ada produk tersedia.
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)]"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-textDark font-bold text-sm">
                  {product.name}
                </h3>
                <div className="bg-[#fbeed4] text-[#9a6a1c] px-2.5 py-1 rounded-md text-[10px] font-medium">
                  Harga: {formatPrice(product.price)}
                </div>
              </div>

              <div className="flex gap-3.5 mb-4">
                {product.image ? (
                  <ApiImage
                    src={product.image}
                    alt={product.name}
                    className="w-24 h-24 object-cover border border-imageBorder rounded-lg shrink-0"
                  />
                ) : (
                  <div className="w-24 h-24 bg-imageBg border border-imageBorder rounded-lg shrink-0"></div>
                )}
                <div className="flex-1 space-y-2 text-[11px]">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2fb380]"></div>
                      <span className="text-textGray">Estimasi bunga</span>
                    </div>
                    <span className="text-[#d6392c] font-bold">
                      {formatProfit(product)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2fb380]"></div>
                      <span className="text-textGray">Siklus berlaku</span>
                    </div>
                    <span className="text-textDark font-medium">
                      {product.duration} Hari
                    </span>
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2fb380] mt-1 shrink-0"></div>
                      <span className="text-textGray leading-tight">
                        Jumlah tersedia per hari
                      </span>
                    </div>
                    <span className="text-textDark font-medium text-right leading-tight ml-2 shrink-0">
                      {availabilityText(product)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onBeliClick?.(product)}
                className="w-full bg-primary text-white py-3 rounded-full text-sm font-medium hover:bg-blue-900 transition-colors"
              >
                Beli Sekarang
              </button>
            </div>
          ))
        )}
      </section>

      {/* Bottom Navigation */}
      <BottomNav active="proyek" onNavigate={onNavigate} icons={navIcons} />

      {/* Error Modal */}
      <ErrorModal
        open={Boolean(error)}
        title="Gagal Memuat Produk"
        message={error}
        onClose={() => setError('')}
      />
    </div>
  )
}

export default ProdukPage
