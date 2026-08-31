import { useEffect, useRef, useState } from 'react'
import backIcon from '../../assets/14_1277.svg'

// Format angka ke format Indonesia dengan prefix Rp (contoh: Rp100.000)
const formatPrice = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return `Rp${String(value)}`
  return `Rp${num.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`
}

// Deadline pembayaran: expire_time ("2026-08-31 01:29:30") dalam milidetik,
// dibatasi maksimal 3 jam ke depan dari sekarang (dihitung sekali saat mount)
const getDeadline = (expireTime) => {
  if (!expireTime) return 0
  const normalized = String(expireTime).includes('T')
    ? expireTime
    : String(expireTime).replace(' ', 'T')
  const ts = new Date(normalized).getTime()
  if (Number.isNaN(ts)) return 0
  return Math.min(ts, Date.now() + 3 * 60 * 60 * 1000)
}

// Format detik → "mm:ss" atau "HH:MM:SS" kalau lebih dari 1 jam
const formatTime = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600)
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const s = String(totalSeconds % 60).padStart(2, '0')
  return h > 0 ? `${String(h).padStart(2, '0')}:${m}:${s}` : `${m}:${s}`
}

function VaPage({ payment, onBackClick, onCheckStatus, onBackHome }) {
  const deadlineRef = useRef(0)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [copied, setCopied] = useState(false)
  const expired = secondsLeft <= 0

  // Countdown tiap detik — deadline dihitung SEKALI supaya timer berdetak turun
  useEffect(() => {
    deadlineRef.current = getDeadline(payment?.expire_time)
    const tick = () =>
      setSecondsLeft(
        deadlineRef.current
          ? Math.max(0, Math.floor((deadlineRef.current - Date.now()) / 1000))
          : 0,
      )
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [payment?.expire_time])

  // Saat waktu habis (tidak bisa bayar lagi), otomatis kembali ke beranda
  useEffect(() => {
    if (!expired) return
    const timer = setTimeout(onBackHome, 5000)
    return () => clearTimeout(timer)
  }, [expired, onBackHome])

  // Salin nomor Virtual Account ke clipboard
  const handleCopyVa = async () => {
    const va = payment?.va
    if (!va) return
    try {
      await navigator.clipboard.writeText(va)
    } catch (err) {
      // Fallback untuk browser tanpa izin clipboard API
      const el = document.createElement('textarea')
      el.value = va
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const methodLabel = payment?.selected_method || 'BRI'

  return (
    <div className="min-h-screen bg-[#eceef1] font-sans flex flex-col">
      {/* Header: back + judul */}
      <section className="max-w-[412px] w-full mx-auto bg-[#0d1b4c] px-4 py-4 flex items-center justify-between shadow-sm">
        <button
          type="button"
          onClick={onBackClick}
          className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors"
          aria-label="Kembali"
        >
          <img src={backIcon} alt="Back" className="w-[18px] h-[18px]" />
        </button>
        <h1 className="text-white font-semibold text-base tracking-wide">
          Pembayaran VA {methodLabel}
        </h1>
        <div className="w-6 h-6" />
      </section>

      {/* Timer countdown */}
      <section className="max-w-[412px] w-full mx-auto bg-[#16255e] py-3 flex flex-col items-center justify-center gap-1">
        <p className="text-[#b7c0dd] text-[13px]">Selesaikan pembayaran dalam</p>
        <p
          className={`font-bold text-[17px] tracking-wider ${
            expired ? 'text-[#d6392c]' : 'text-[#ffd88a]'
          }`}
        >
          {formatTime(secondsLeft)}
        </p>
        {expired && (
          <p className="text-[#ffb4ab] text-xs mt-0.5">
            Waktu habis — mengarahkan ke beranda...
          </p>
        )}
      </section>

      {/* Detail pembayaran + nomor VA */}
      <section className="max-w-[412px] w-full mx-auto bg-white pt-6 pb-4 px-5 flex flex-col items-center">
        <p className="text-[#9aa0a6] text-sm mb-1">Total Pembayaran</p>
        <p className="text-[#1c1c1e] text-[28px] font-bold mb-6">
          {formatPrice(payment?.amount)}
        </p>

        <div className="w-full border border-[#e2e4e8] rounded-[16px] p-4 mb-4 flex flex-col items-center gap-2 bg-white shadow-sm">
          <p className="text-[#9aa0a6] text-xs">Nomor Virtual Account</p>
          <p className="text-[#0d1b4c] text-[22px] font-bold tracking-[0.06em] break-all text-center leading-snug">
            {payment?.va || '-'}
          </p>
          <button
            type="button"
            onClick={handleCopyVa}
            className="mt-1 px-4 py-1.5 rounded-full bg-[#dbe9fb] text-[#0d1b4c] text-xs font-semibold hover:bg-[#c9ddf7] transition-colors"
          >
            {copied ? 'Tersalin ✓' : 'Salin Nomor'}
          </button>
        </div>

        <div className="bg-[#dbe9fb] px-3 py-1 rounded-[6px]">
          <span className="text-[#0d1b4c] text-xs font-bold tracking-wide">
            {methodLabel}
          </span>
        </div>
      </section>

      {/* Cara pembayaran (dari method_guide server) */}
      <section className="max-w-[412px] w-full mx-auto bg-white px-5 pt-4 pb-6">
        <h2 className="text-[#1c1c1e] font-bold text-base mb-5">Cara Pembayaran</h2>
        {Array.isArray(payment?.method_guide) && payment.method_guide.length > 0 ? (
          payment.method_guide.map((guide, gi) => (
            <div key={gi} className="mb-6 last:mb-0">
              <h3 className="text-[#1c1c1e] font-bold text-sm mb-3">
                {guide.subject}
              </h3>
              <div className="flex flex-col gap-2">
                {String(guide.content || '')
                  .split('\n')
                  .filter(Boolean)
                  .map((line, li) => (
                    <p key={li} className="text-[#4a4d52] text-sm leading-[1.4]">
                      {line}
                    </p>
                  ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-[#4a4d52] text-sm leading-[1.4]">
            Lakukan pembayaran melalui ATM / Mobile Banking / Internet Banking
            dengan nomor Virtual Account di atas.
          </p>
        )}
      </section>

      {/* Footer actions */}
      <section className="max-w-[412px] w-full mx-auto bg-[#eceef1] px-5 py-6 flex flex-col gap-4 mt-auto">
        <button
          type="button"
          onClick={onCheckStatus}
          className="w-full bg-[#0d1b4c] text-white rounded-[24px] py-[15px] font-semibold text-[15px] hover:bg-[#16255e] transition-colors active:scale-[0.98]"
        >
          Cek Status Pembayaran
        </button>
        <button
          type="button"
          onClick={onBackClick}
          className="w-full text-[#d6392c] text-sm font-medium py-2 hover:opacity-80 transition-opacity"
        >
          Batalkan Pembayaran
        </button>
      </section>
    </div>
  )
}

export default VaPage
