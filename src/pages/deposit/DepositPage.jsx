import { useEffect, useState } from 'react'
import backIcon from '../../assets/14_1277.svg'

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

// Format angka ke format Indonesia dengan prefix Rp (contoh: Rp1.537.000)
const formatPrice = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return `Rp${String(value)}`
  return `Rp${num.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`
}

const quickAmounts = [
  '100.000',
  '350.000',
  '500.000',
  '1.000.000',
  '2.000.000',
  '5.000.000',
]

const paymentMethods = [
  { id: 'qris', name: 'QRIS', desc: 'Scan untuk bayar' },
  { id: 'va-bri', name: 'Transfer VA BRI', desc: 'Virtual account' },
  { id: 'lainnya', name: 'Lainnya', desc: 'Scan untuk bayar' },
]

function DepositPage({ onBackClick }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('qris')
  const [balance, setBalance] = useState(null) // null = belum termuat

  // Ambil saldo deposit (balance_deposit) user dari account-info
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
        if (data && data.balance_deposit !== undefined)
          setBalance(data.balance_deposit)
      } catch (err) {
        // Abaikan — saldo tetap tampil dengan nilai fallback
      }
    }
    loadBalance()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Header & Balance Section */}
      <section className="w-full max-w-[100%] min-h-[120px] mx-auto bg-primary text-white pb-6">
        {/* Top Navigation Bar */}
        <div className="flex items-center px-4 py-4">
          <button
            type="button"
            onClick={onBackClick}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors -ml-2"
            aria-label="Back"
          >
            <img src={backIcon} alt="Back" className="w-[18px] h-[18px]" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-base pr-6">
            Deposit
          </h1>
        </div>

        {/* Balance Display */}
        <div className="px-5 pb-2 pt-2 flex flex-col gap-1">
          <p className="text-[#b7c0dd] text-sm">Saldo Tersedia</p>
          <p className="text-2xl font-bold tracking-tight">
            {balance !== null ? formatPrice(balance) : 'Memuat...'}
          </p>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="w-full max-w-[412px] mx-auto bg-white rounded-t-[24px] -mt-4 relative z-10 px-5 py-6 flex flex-col gap-6 min-h-[calc(100vh-120px)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {/* Deposit Amount Input Area */}
        <div className="flex flex-col gap-3">
          <label className="text-textDark text-sm font-medium">
            Jumlah Deposit
          </label>

          {/* Custom Input Field */}
          <div className="flex items-center border border-brand-border rounded-xl px-4 py-3.5 gap-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
            <span className="text-textDark font-medium">Rp</span>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="flex-1 outline-none text-textDark placeholder-[#b0b4ba] font-medium bg-transparent w-full"
            />
          </div>

          {/* Quick Amount Selection Grid */}
          <div className="grid grid-cols-3 gap-2.5 mt-1">
            {quickAmounts.map((quick) => {
              const isSelected = amount === quick
              return (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setAmount(quick)}
                  className={`rounded-[10px] py-3 text-sm font-medium text-center transition-colors ${
                    isSelected
                      ? 'bg-[#dbe9fb] border border-primary text-primary'
                      : 'border border-brand-border text-textDark hover:bg-gray-50'
                  }`}
                >
                  Rp{quick}
                </button>
              )
            })}
          </div>
        </div>

        {/* Payment Methods List */}
        <div className="flex flex-col gap-3">
          <h2 className="text-textDark text-sm font-medium">
            Metode Pembayaran
          </h2>

          <div className="flex flex-col gap-3">
            {paymentMethods.map((pay) => {
              const isSelected = method === pay.id
              return (
                <label
                  key={pay.id}
                  className={`flex items-center p-3.5 rounded-xl gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border border-primary bg-[#f5f7fd]'
                      : 'border border-brand-border hover:bg-gray-50'
                  }`}
                >
            
                  <div className="flex flex-col flex-1">
                    <span className="text-textDark text-sm font-medium">
                      {pay.name}
                    </span>
                    <span className="text-textLight text-xs">{pay.desc}</span>
                  </div>
                  {/* Custom Radio Button */}
                  <button
                    type="button"
                    onClick={() => setMethod(pay.id)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-primary' : 'border-[#d3d6db]'
                    }`}
                    aria-label={`Pilih ${pay.name}`}
                  >
                    {isSelected && (
                      <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>
                    )}
                  </button>
                </label>
              )
            })}
          </div>
        </div>

        {/* Information/Warning Banner */}
        <div className="bg-[#fbeed4] rounded-xl p-3.5 flex gap-2.5 items-start mt-2">
          <div className="w-[18px] h-[18px] bg-[#d6a13a] rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-white text-[10px] font-bold italic">i</span>
          </div>
          <p className="text-[#6a4f16] text-xs leading-relaxed">
            Pastikan nominal dan metode pembayaran sudah sesuai. Deposit akan
            diproses setelah pembayaran berhasil dikonfirmasi.
          </p>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          className="w-full bg-primary text-white font-medium py-3.5 rounded-full mt-4 hover:bg-[#0a153a] transition-colors active:scale-[0.98]"
        >
          Lanjutkan
        </button>
      </section>
    </div>
  )
}

export default DepositPage
