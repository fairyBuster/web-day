import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import backIcon from '../../assets/14_1277.svg'
import { fetchImageWithCache } from '../../utils/imageCache'

// Format angka ke format Indonesia dengan prefix Rp (contoh: Rp1.537.000)
const formatPrice = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return `Rp${String(value)}`
  return `Rp${num.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`
}

// Deadline pembayaran: expired_minutes (relatif dari server) atau expires_at,
// tapi tampilan dibatasi maksimal 3 jam supaya format timer tetap wajar
const getDeadline = (payment) => {
  let deadline = 0
  if (payment?.expired_minutes) {
    deadline = Date.now() + Number(payment.expired_minutes) * 60000
  } else if (payment?.expires_at) {
    const ts = new Date(payment.expires_at).getTime()
    if (!Number.isNaN(ts)) deadline = ts
  }
  if (!deadline) return 0
  return Math.min(deadline, Date.now() + 3 * 60 * 60 * 1000)
}

const formatTime = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600)
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const s = String(totalSeconds % 60).padStart(2, '0')
  return h > 0 ? `${String(h).padStart(2, '0')}:${m}:${s}` : `${m}:${s}`
}

function QrisPage({ payment, onBackClick, onCheckStatus, onBackHome }) {
  const canvasRef = useRef(null)
  const deadlineRef = useRef(0)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [qrImageUrl, setQrImageUrl] = useState('')
  const expired = secondsLeft <= 0

  // Countdown tiap detik sampai deadline pembayaran
  useEffect(() => {
    deadlineRef.current = getDeadline(payment)
    const tick = () =>
      setSecondsLeft(
        deadlineRef.current
          ? Math.max(0, Math.floor((deadlineRef.current - Date.now()) / 1000))
          : 0,
      )
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [payment])

  // Saat waktu habis (tidak bisa bayar lagi), otomatis kembali ke beranda
  useEffect(() => {
    if (!expired) return
    const timer = setTimeout(onBackHome, 5000)
    return () => clearTimeout(timer)
  }, [expired, onBackHome])

  // Mode QRIS manual: qr_image adalah path gambar dari server → blob fetch
  useEffect(() => {
    if (!payment?.qr_image) {
      setQrImageUrl('')
      return
    }
    let cancelled = false
    fetchImageWithCache(payment.qr_image)
      .then((res) => {
        if (!cancelled && res?.objectUrl) setQrImageUrl(res.objectUrl)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [payment?.qr_image])

  // Render kode QRIS (pay_data) ke canvas
  useEffect(() => {
    if (!canvasRef.current || !payment?.pay_data) return
    QRCode.toCanvas(
      canvasRef.current,
      payment.pay_data,
      { width: 200, margin: 1, errorCorrectionLevel: 'M' },
      (err) => {
        if (err) console.error('Gagal render QR:', err)
      },
    )
  }, [payment])

  // Simpan QR sebagai file PNG
  const handleSaveQr = () => {
    if (qrImageUrl) {
      const link = document.createElement('a')
      link.download = `qris-${payment?.ref_id || 'pembayaran'}.png`
      link.href = qrImageUrl
      link.click()
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `qris-${payment?.ref_id || 'pembayaran'}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

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
          Pembayaran QRIS
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

      {/* Detail pembayaran + QR code */}
      <section className="max-w-[412px] w-full mx-auto bg-white pt-6 pb-8 px-5 flex flex-col items-center">
        <p className="text-[#9aa0a6] text-sm mb-1">Total Pembayaran</p>
        <p className="text-[#1c1c1e] text-[28px] font-bold mb-6">
          {formatPrice(payment?.amount)}
        </p>

        <div className="w-[220px] h-[220px] border border-[#e2e4e8] rounded-[16px] mb-3 flex items-center justify-center bg-white shadow-sm overflow-hidden">
          {qrImageUrl ? (
            <img
              src={qrImageUrl}
              alt="Kode QRIS"
              className="w-full h-full object-contain p-2"
            />
          ) : (
            <canvas ref={canvasRef} />
          )}
        </div>

        {payment?.message ? (
          <p className="text-[#4a4d52] text-xs text-center leading-relaxed mb-3 px-2">
            {payment.message}
          </p>
        ) : null}

        <div className="bg-[#dbe9fb] px-3 py-1 rounded-[6px] mb-6">
          <span className="text-[#0d1b4c] text-xs font-bold tracking-wide">
            QRIS
          </span>
        </div>

        <button
          type="button"
          onClick={handleSaveQr}
          className="w-full border border-[#e2e4e8] rounded-[12px] py-[11px] flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors active:bg-gray-100"
        >
          <span className="text-[#1c1c1e] text-sm font-medium">Simpan QR</span>
        </button>
      </section>

      {/* Cara pembayaran */}
      <section className="max-w-[412px] w-full mx-auto bg-white px-5 py-6">
        <h2 className="text-[#1c1c1e] font-bold text-base mb-5">
          Cara Pembayaran
        </h2>
        <div className="flex flex-col gap-4">
          {[
            'Buka aplikasi e-wallet atau mobile banking yang mendukung QRIS.',
            'Pilih menu Scan QR / Bayar, lalu arahkan kamera ke kode QR di atas.',
            'Periksa nominal pembayaran, lalu konfirmasi dan selesaikan transaksi.',
            'Saldo akan otomatis masuk setelah pembayaran berhasil diverifikasi.',
          ].map((step, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="w-[22px] h-[22px] rounded-full bg-[#dbe9fb] flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[#0d1b4c] text-xs font-bold">{i + 1}</span>
              </div>
              <p className="text-[#4a4d52] text-sm leading-[1.4]">{step}</p>
            </div>
          ))}
        </div>
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

export default QrisPage
