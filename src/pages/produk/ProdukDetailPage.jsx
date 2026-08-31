import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import backIcon from '../../assets/10_783.svg'
import ErrorModal from '../../components/ErrorModal'
import ApiImage from '../../components/ApiImage'
import SuccessModal from '../../components/SuccessModal'

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

// Format angka ke format Indonesia dengan prefix Rp (contoh: Rp1.350.000,00)
const formatPrice = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return `Rp${String(value)}`
  return `Rp${num.toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

// Dividen harian mengikuti profit_type dari API:
// percentage → harga * rate / 100, selainnya → profit_rate langsung (fixed)
const calcDaily = (product) => {
  const price = Number(product.price) || 0
  const rate = Number(product.profit_rate) || 0
  if (product.profit_type === 'percentage') return (price * rate) / 100
  return rate
}

function ProdukDetailPage({ productId, onBackClick }) {
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(Boolean(productId))
  const [error, setError] = useState('')
  const [purchasing, setPurchasing] = useState(false)
  const [withdrawPin, setWithdrawPin] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [balance, setBalance] = useState(null) // null = belum termuat

  useEffect(() => {
    if (!productId) {
      setError('Produk tidak ditemukan.')
      setLoading(false)
      return
    }
    const loadProduct = async () => {
      setLoading(true)
      setError('')
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`${API_BASE}/api/products/${productId}/`, {
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
          setError(getErrorMessage(data, 'Gagal memuat detail produk.'))
          return
        }
        setProduct(data)
      } catch (err) {
        setError(
          'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
        )
      } finally {
        setLoading(false)
      }
    }
    loadProduct()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  // Ambil saldo user dari account-info untuk tampilan "Saldo Tersedia"
  useEffect(() => {
    const loadBalance = async () => {
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
        // Ambil saldo deposit (balance_deposit) user dari account-info
        if (data && data.balance_deposit !== undefined)
          setBalance(data.balance_deposit)
      } catch (err) {
        // Abaikan — saldo tetap tampil dengan nilai fallback
      }
    }
    loadBalance()
  }, [])

  const handlePurchase = async () => {
    if (!productId) return
    setPurchasing(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/products/purchase/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          product_id: Number(productId),
          quantity: 1,
          withdraw_pin: withdrawPin,
        }),
      })
      let json
      try {
        json = await res.json()
      } catch (parseErr) {
        setError(
          `Terjadi kesalahan koneksi. Tolong segarkan halamannya.`,
        )
        return
      }
      const data = parseResponse(json)
      if (!res.ok) {
        // Batas pembelian tercapai → field error (mis. product_id: ["Batas pembelian..."])
        const limitMsg = Object.values(data || {})
          .filter(Array.isArray)
          .flat()
          .find(
            (m) =>
              typeof m === 'string' && m.toLowerCase().includes('batas pembelian'),
          )
        if (limitMsg) {
          // Persingkat: ambil angka batas & jumlah sudah terbeli (mis. "1 kali ... 2 kali")
          const nums = limitMsg.match(/\d+/g)
          setError(
            nums && nums.length >= 2
              ? `Batas pembelian tercapai. Maksimal ${nums[0]}x, sudah ${nums[1]}x.`
              : 'Batas pembelian tercapai.',
          )
          return
        }
        // Saldo tidak cukup → notifikasi jelas (backend: "Insufficient ...")
        const rawErr = String(data?.error || data?.detail || '')
        if (rawErr.toLowerCase().includes('insufficient')) {
          const isDeposit = rawErr.toLowerCase().includes('deposit')
          setError(
            `Saldo tidak cukup di ${isDeposit ? 'Dompet isi ulang' : 'saldo utama'}. Silakan isi ulang.`,
          )
          return
        }
        setError(
          getErrorMessage(data, 'Gagal membeli produk.'),
        )
        return
      }
      setSuccessMessage(
        data.detail || `${data.product_name || 'Produk'} berhasil dibeli.`,
      )
      setShowSuccess(true)
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
    } finally {
      setPurchasing(false)
    }
  }

  // Spek dinamis dari data produk (fallback ke deskripsi default jika kosong)
  const duration = Number(product?.duration) || 0
  const daily = product ? calcDaily(product) : 0
  const total = daily * duration

  const specs = product
    ? [
        {
          label: 'Kisaran jumlah pembelian',
          value: formatPrice(product.price),
          bold: true,
        },
        {
          label: 'Siklus berlaku',
          value: `${product.duration} Hari`,
        },
        {
          label: 'Jenis manfaat',
          value:
            product.description ||
            'Bunga dikembalikan setiap hari dan pokok dilunasi pada saat jatuh tempo',
        },
        {
          label: 'Dividen harian',
          value: formatPrice(daily),
          red: true,
        },
        {
          label: 'Total didapat',
          value: formatPrice(total),
          red: true,
        },
        {
          label: 'Hasil akhir',
          value: formatPrice((Number(product.price) || 0) + total),
          red: true,
        },
      ]
    : []

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header Section */}
      <section className="max-w-md mx-auto">
        <div className="bg-primary h-14 flex items-center px-4 sticky top-0 z-10">
          <button
            type="button"
            onClick={onBackClick}
            className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <img src={backIcon} alt="Back" className="w-4 h-4" />
          </button>
          <h1 className="flex-1 text-center text-white font-medium pr-6">
            Detail Produk
          </h1>
        </div>
      </section>

      {/* Details Section */}
      <section className="max-w-md mx-auto p-4 pt-5">
        <div className="bg-white rounded-[14px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.05)] relative">
          {/* Product Image / Placeholder */}
          {product?.image ? (
            <ApiImage
              src={product.image}
              alt={product.name}
              className="absolute top-5 right-5 w-[92px] h-[76px] object-cover border border-imageBorder rounded-lg"
            />
          ) : (
            <div className="absolute top-5 right-5 w-[92px] h-[76px] bg-imageBg border border-imageBorder rounded-lg"></div>
          )}

          {/* Product Title */}
          <h2 className="text-[#d6392c] font-bold mb-5 text-base pr-28">
            {loading ? 'Memuat...' : product?.name || 'PO No.1'}
          </h2>

          {/* Specifications List */}
          {loading ? (
            <p className="text-[13px] text-textGray">
              Memuat detail produk...
            </p>
          ) : (
            <div className="flex flex-col gap-3 text-[13px] text-textDark">
              {specs.map((spec) => (
                <div key={spec.label} className="flex gap-2 pr-24">
                  <span className="text-[#d6392c] mt-0.5">•</span>
                  <span className="w-[110px] shrink-0">{spec.label}</span>
                  <span
                    className={`flex-1 leading-tight ${
                      spec.red ? 'text-[#d6392c] font-bold' : ''
                    } ${spec.bold ? 'font-bold' : ''}`}
                  >
                    {spec.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Action Section */}
      <section className="max-w-md mx-auto p-4 pt-0">
        <div className="bg-white rounded-[14px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
          <p className="text-[13px] text-textDark mb-4">
            Saldo Tersedia:{' '}
            <span className="text-[#d6392c] font-bold">
              {balance !== null
                ? `Rp${Number(balance).toLocaleString('id-ID', {
                    maximumFractionDigits: 0,
                  })}`
                : 'Memuat...'}
            </span>
          </p>
          {product?.require_withdraw_pin_on_purchase ? (
            <div className="mb-4">
              <label className="block text-[12px] text-textGray mb-1">
                PIN Penarikan
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={withdrawPin}
                onChange={(e) => setWithdrawPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Masukkan PIN 6 digit"
                className="w-full h-[44px] px-4 rounded-[12px] border border-borderGray text-[14px] text-textDark outline-none focus:border-primary bg-white"
              />
            </div>
          ) : null}
          <button
            type="button"
            onClick={handlePurchase}
            disabled={purchasing || loading}
            className="w-full h-[51px] bg-primary text-white rounded-[24px] font-medium text-sm flex items-center justify-center hover:bg-blue-900 transition-colors disabled:opacity-60"
          >
            {purchasing ? 'Memproses...' : 'Mulai Sekarang'}
          </button>
        </div>
      </section>

      {/* Error Modal */}
      <ErrorModal
        open={Boolean(error)}
        title="Gagal Membeli Produk"
        message={error}
        onClose={() => setError('')}
      />

      {/* Success Modal */}
      <SuccessModal
        open={showSuccess}
        title="Pembelian Berhasil"
        message={successMessage}
        onClose={() => {
          setShowSuccess(false)
          onBackClick?.()
        }}
      />
    </div>
  )
}

export default ProdukDetailPage
