import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import backIcon from '../../assets/27_79.svg'
import giftIcon from '../../assets/27_86.svg'
import historyIcon1 from '../../assets/27_125.svg'
import historyIcon2 from '../../assets/27_137.svg'
import ErrorModal from '../../components/ErrorModal'
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

const terms = [
  'Setiap kode hanya dapat digunakan satu kali per akun.',
  'Kode memiliki masa berlaku dan akan hangus jika lewat tanggal kedaluwarsa.',
  'Hadiah akan otomatis masuk ke saldo Anda setelah kode berhasil ditukar.',
]

// Format tanggal API → "20 Agustus 2026, 10:15"
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

// Format angka ke format Indonesia (contoh: 25.000)
const formatAmount = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return num.toLocaleString('id-ID')
}

function VoucherPage({ onBackClick }) {
  const [code, setCode] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)

  // Riwayat penukaran voucher (maks 10 transaksi type VOUCHER)
  useEffect(() => {
    const loadHistory = async () => {
      setHistoryLoading(true)
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`${API_BASE}/api/transactions/?type=VOUCHER`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        let json
        try {
          json = await res.json()
        } catch (parseErr) {
          return
        }
        const data = parseResponse(json)
        if (!res.ok) return
        const results = Array.isArray(data.results) ? data.results : []
        setHistory(
          results.slice(0, 10).map((trx, index) => ({
            code: trx.voucher_code || trx.transaction_id || trx.trx_id || '-',
            date: formatDate(trx.created_at),
            amount: `+Rp${formatAmount(trx.amount)}`,
            icon: index % 2 === 0 ? historyIcon1 : historyIcon2,
          })),
        )
      } catch (err) {
        // Abaikan — riwayat bersifat opsional
      } finally {
        setHistoryLoading(false)
      }
    }
    loadHistory()
  }, [])

  const handleClaim = async () => {
    const trimmed = code.trim()
    if (!trimmed) {
      setError('Masukkan kode voucher terlebih dahulu.')
      return
    }
    setClaiming(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/vouchers/claim/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code: trimmed }),
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
        setError(
          getErrorMessage(
            data,
            res.status === 404
              ? 'Voucher tidak ditemukan.'
              : 'Gagal menukar voucher.',
          ),
        )
        return
      }
      const amount = Number(data.amount || 0)
      setSuccessMessage(
        data.message ||
          `Kode ${data.voucher_code || trimmed} berhasil ditukar! +Rp${Number.isNaN(
            amount,
          )
            ? 0
            : amount.toLocaleString('id-ID')} masuk ke saldo.`,
      )
      setShowSuccess(true)
      setCode('')
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header Section */}
      <section className="bg-primary w-full">
        <div className="max-w-[412px] mx-auto py-4 flex items-center">
          {/* Back Button */}
          <button
            type="button"
            onClick={onBackClick}
            className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity focus:outline-none"
            aria-label="Back"
          >
            <img src={backIcon} alt="Back" className="w-full h-full" />
          </button>
          {/* Title */}
          <h1 className="flex-1 text-center text-white font-semibold pr-6">
            Redeem Kode
          </h1>
        </div>
      </section>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#0d1b4c] to-[#16255e] w-full">
        <div className="max-w-[100%] mx-auto px-2 pt-5 pb-12 flex flex-col items-center text-center">
          {/* Gift Icon Container */}
          <div className="w-[60px] h-[60px] rounded-full bg-white/15 flex items-center justify-center mb-4">
            <img src={giftIcon} alt="Gift" className="w-[26px] h-[26px]" />
          </div>
          {/* Main Heading */}
          <h2 className="text-white font-bold text-lg mb-2">
            Tukar Kode, Dapat Hadiah
          </h2>
          {/* Subtitle */}
          <p className="text-[#b7c0dd] text-sm leading-relaxed max-w-[280px]">
            Masukkan kode voucher atau promo untuk menukarkannya dengan saldo
            atau hadiah.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="w-full min-h-screen">
        <div className="max-w-[412px] mx-auto px-4 -mt-7 space-y-4 pb-12">
          {/* Input Card */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_6px_20px_0_rgba(13,27,76,0.08)] relative z-10">
            <label className="block text-textDark text-sm font-semibold mb-3">
              Kode Voucher
            </label>
            <div className="flex gap-2.5 mb-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Masukkan kode di sini"
                className="flex-1 bg-[#f7f8fa] border border-[#c7cbd1] rounded-xl px-4 py-3 text-sm text-textDark placeholder-[#b0b4ba] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              <button
                type="button"
                onClick={handleClaim}
                disabled={claiming}
                className="bg-primary text-white rounded-xl px-6 py-3 text-sm font-semibold hover:bg-[#16255e] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-60"
              >
                {claiming ? 'Memproses...' : 'Tukar'}
              </button>
            </div>
            <p className="text-textLight text-xs">
              Kode bersifat sensitif huruf besar/kecil
            </p>
          </div>

          {/* Terms Card */}
          <div className="bg-white rounded-2xl p-5">
            <h3 className="text-textDark font-semibold mb-4">
              Ketentuan Redeem
            </h3>
            <ul className="space-y-3">
              {terms.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary font-bold mt-0.5">•</span>
                  <p className="text-[#6a6d72] text-sm leading-relaxed">
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* History Card */}
          <div className="bg-white rounded-2xl p-5">
            <h3 className="text-textLight text-xs font-semibold uppercase tracking-wider mb-4">
              Riwayat Penukaran
            </h3>
            <div className="flex flex-col">
              {historyLoading ? (
                <p className="text-textLight text-xs py-3">
                  Memuat riwayat...
                </p>
              ) : history.length === 0 ? (
                <p className="text-textLight text-xs py-3">
                  Belum ada riwayat penukaran.
                </p>
              ) : (
                history.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 py-3 ${
                      index < history.length - 1
                        ? 'border-b border-borderGray'
                        : ''
                    }`}
                  >
                    <div className="w-[38px] h-[38px] rounded-lg bg-[#fbeed4] flex items-center justify-center shrink-0">
                      <img src={item.icon} alt="Icon" className="w-[18px] h-[18px]" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-textDark text-sm font-semibold">
                        {item.code}
                      </h4>
                      <p className="text-textLight text-xs mt-0.5">{item.date}</p>
                    </div>
                    <div className="text-[#2fb380] text-sm font-semibold shrink-0">
                      {item.amount}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Error Modal */}
      <ErrorModal
        open={Boolean(error)}
        title="Gagal Menukar Voucher"
        message={error}
        onClose={() => setError('')}
      />

      {/* Success Modal */}
      <SuccessModal
        open={showSuccess}
        title="Voucher Berhasil Ditukar"
        message={successMessage}
        onClose={() => setShowSuccess(false)}
      />
    </div>
  )
}

export default VoucherPage
