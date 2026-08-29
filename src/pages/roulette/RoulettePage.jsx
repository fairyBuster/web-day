import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import backIcon from '../../assets/19_611.svg'
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

// Format nominal (contoh: Rp50.000)
const formatPrice = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return `Rp${String(value)}`
  return `Rp${num.toLocaleString('id-ID')}`
}

// Slice fallback kalau daftar hadiah dari API kosong / gagal dimuat
const DEFAULT_SLICES = [
  { name: 'Rp10.000' },
  { name: 'Rp5.000' },
  { name: 'Logam Mulia' },
  { name: 'Rp2.000' },
  { name: 'Baju Uniqlo' },
  { name: 'Rp1.000' },
  { name: 'Mobil Brio' },
  { name: 'Rp50.000' },
]

// Bangun warna selang-seling merah/biru sesuai jumlah slice
const buildConicGradient = (count) => {
  const angle = 360 / count
  const colors = ['#d6392c', '#0d1b4c']
  const stops = []
  for (let i = 0; i < count; i += 1) {
    stops.push(
      `${colors[i % 2]} ${(angle * i).toFixed(2)}deg ${(
        angle * (i + 1)
      ).toFixed(2)}deg`,
    )
  }
  return `conic-gradient(from ${(-angle / 2).toFixed(2)}deg, ${stops.join(',')})`
}

// Pesan hasil putaran sesuai jenis hadiah dari backend
const buildResultMessage = (data) => {
  const amount = Number(data.prize_amount || 0)
  const formatted = `Rp${amount.toLocaleString('id-ID')}`
  if (data.prize_type === 'BALANCE')
    return `Selamat! Kamu mendapat ${formatted} yang masuk ke saldo utama.`
  if (data.prize_type === 'BALANCE_DEPOSIT')
    return `Selamat! Kamu mendapat ${formatted} yang masuk ke saldo deposit.`
  if (data.prize_name && amount > 0)
    return `Selamat! Kamu mendapat hadiah ${data.prize_name}.`
  return 'Sayang sekali, belum beruntung kali ini. Coba lagi!'
}

// Label hadiah untuk riwayat putaran milik user sendiri
const buildHistoryReward = (data) => {
  const amount = Number(data.prize_amount || 0)
  if (
    (data.prize_type === 'BALANCE' || data.prize_type === 'BALANCE_DEPOSIT') &&
    amount > 0
  ) {
    return `Rp${amount.toLocaleString('id-ID')}`
  }
  if (data.prize_name) return data.prize_name
  return 'Coba Lagi'
}

function RoulettePage({ onBackClick }) {
  const [prizes, setPrizes] = useState([])
  const [tickets, setTickets] = useState(null) // null = belum termuat
  const [earn, setEarn] = useState(null) // konfigurasi cara dapat tiket
  const [rouletteActive, setRouletteActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  // Riwayat putaran milik user sendiri — backend tidak punya endpoint riwayat,
  // jadi disimpan lokal supaya user baru mulai kosong dan terisi saat muter.
  const [history, setHistory] = useState(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem('roulette_history') || '[]',
      )
      return Array.isArray(saved) ? saved : []
    } catch (err) {
      return []
    }
  })

  // Ambil status roulette: sisa tiket + daftar hadiah
  useEffect(() => {
    const loadStatus = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`${API_BASE}/api/roulette/status/`, {
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
        setRouletteActive(data.is_active !== false)
        setTickets(Number(data.tickets) || 0)
        if (Array.isArray(data.prizes) && data.prizes.length > 0) {
          setPrizes(data.prizes)
        }
      } catch (err) {
        // Abaikan — roda tetap tampil dengan slice fallback
      } finally {
        setLoading(false)
      }
    }
    loadStatus()
  }, [])

  // Cara mendapatkan tiket (aturan dari backend /api/roulette/earn/)
  useEffect(() => {
    const loadEarn = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`${API_BASE}/api/roulette/earn/`, {
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
        setEarn(data)
      } catch (err) {
        // Abaikan — teks cara dapat tiket memakai fallback statis
      }
    }
    loadEarn()
  }, [])

  const sliceList = prizes.length > 0 ? prizes : DEFAULT_SLICES
  const sliceAngle = 360 / sliceList.length
  const slices = sliceList.map((item, index) => ({
    label: item.name || 'Hadiah',
    rotate: index * sliceAngle,
    prize: item,
  }))

  const handleSpin = async () => {
    if (spinning) return
    if (tickets !== null && tickets <= 0) {
      setError(
        'Kesempatan putar sudah habis. Ajak teman bergabung atau lakukan deposit untuk mendapatkan tiket lagi.',
      )
      return
    }
    setSpinning(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/roulette/spin/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      })
      let json
      try {
        json = await res.json()
      } catch (parseErr) {
        setError(
          'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
        )
        setSpinning(false)
        return
      }
      const data = parseResponse(json)
      if (!res.ok) {
        setError(
          getErrorMessage(data, 'Tidak bisa memutar roulette saat ini.'),
        )
        setSpinning(false)
        return
      }
      // Berhenti tepat di hadiah yang dimenangkan backend
      const targetIndex = slices.findIndex(
        (s) => s.prize && s.prize.id === data.prize_id,
      )
      const stopIndex =
        targetIndex >= 0
          ? targetIndex
          : Math.floor(Math.random() * slices.length)
      setRotation(1800 + ((360 - stopIndex * sliceAngle) % 360))
      // Setelah animasi selesai, tampilkan hasil & perbarui sisa tiket
      window.setTimeout(() => {
        setTickets(Number(data.tickets_after) || 0)
        setSpinning(false)
        setRotation((r) => r % 360)
        setSuccessMessage(buildResultMessage(data))
        setShowSuccess(true)
        // Catat hasil putaran ke riwayat lokal (terbaru di atas, maksimal 20)
        const entry = {
          reward: buildHistoryReward(data),
          date: new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }),
        }
        setHistory((prev) => {
          const next = [entry, ...prev].slice(0, 20)
          try {
            localStorage.setItem('roulette_history', JSON.stringify(next))
          } catch (err) {
            // Abaikan — gagal simpan hanya kehilangan riwayat lokal
          }
          return next
        })
      }, 4200)
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
      setSpinning(false)
    }
  }

  const ticketLabel = tickets === null ? '-' : `${tickets}x`

  // Aturan cara dapat tiket yang aktif (mengikuti konfigurasi backend)
  const earnRules = []
  if (
    earn?.grant_tickets_from_level1_purchase &&
    Number(earn.tickets_per_level1_purchase) > 0
  ) {
    earnRules.push({
      key: 'level1',
      label: 'Teman level 1 bergabung & beli produk',
      value: `+${earn.tickets_per_level1_purchase} putaran`,
    })
  }
  if (
    earn?.grant_tickets_from_self_deposit &&
    Number(earn.tickets_per_completed_deposit) > 0
  ) {
    earnRules.push({
      key: 'deposit',
      label: `Deposit minimal ${formatPrice(earn.min_deposit_amount_for_tickets)}`,
      value: `+${earn.tickets_per_completed_deposit} putaran`,
    })
  }

  // Teks hero mengikuti aturan yang aktif
  const heroEarnText = (() => {
    if (
      earn?.grant_tickets_from_level1_purchase &&
      Number(earn.tickets_per_level1_purchase) > 0
    ) {
      return `Setiap 1 teman level 1 yang bergabung, kamu dapat ${earn.tickets_per_level1_purchase} kesempatan putar roulette.`
    }
    if (
      earn?.grant_tickets_from_self_deposit &&
      Number(earn.tickets_per_completed_deposit) > 0
    ) {
      return `Deposit minimal ${formatPrice(earn.min_deposit_amount_for_tickets)} untuk mendapat ${earn.tickets_per_completed_deposit} kesempatan putar roulette.`
    }
    return 'Setiap 1 teman yang bergabung, kamu dapat 1 kesempatan putar roulette.'
  })()

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header Section */}
      <section className="bg-background">
        <div className="max-w-md mx-auto bg-primary text-white px-4 py-4 flex items-center">
          <button
            type="button"
            onClick={onBackClick}
            className="w-6 h-6 flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
          >
            <img src={backIcon} alt="Back" className="w-4 h-4" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-[16px] pr-6">
            Putar Keberuntungan
          </h1>
        </div>
      </section>

      {/* Hero Section */}
      <section className="bg-background">
        <div className="max-w-md mx-auto bg-gradient-to-b from-primary to-[#16255e] px-5 pt-6 pb-[90px] text-center">
          <h2 className="text-white font-bold text-[16px] mb-2">
            Ajak Teman, Dapat Putaran Gratis
          </h2>
          <p className="text-[#b7c0dd] text-[13px] leading-relaxed px-2">
            {heroEarnText}
          </p>
        </div>
      </section>

      {/* Roulette Section */}
      <section className="bg-background">
        <div className="max-w-md mx-auto relative flex flex-col items-center z-10 pb-8">
          {/* Wheel Wrapper */}
          <div className="relative -mt-[70px]">
            {/* Pointer Triangle */}
            <div className="absolute -top-[12px] left-1/2 -translate-x-1/2 z-20 drop-shadow-md">
              <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[18px] border-t-[#d6392c]"></div>
            </div>

            {/* Main Wheel Container */}
            <div
              className={`w-[280px] h-[280px] rounded-full border-[8px] border-white shadow-[0_4px_20px_rgba(0,0,0,0.15)] bg-white relative flex items-center justify-center overflow-hidden ${
                spinning
                  ? 'transition-transform duration-[4000ms] ease-[cubic-bezier(0.12,0.8,0.15,1)]'
                  : 'transition-none'
              }`}
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              {/* Colored Slices */}
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: buildConicGradient(sliceList.length) }}
              ></div>

              {/* Text Labels */}
              <div className="absolute inset-0 flex items-center justify-center">
                {slices.map((slice) => (
                  <div
                    key={slice.label}
                    className="absolute h-full py-[24px] flex items-start justify-center"
                    style={{ transform: `rotate(${slice.rotate}deg)` }}
                  >
                    <span className="text-white text-[11px] font-bold">
                      {slice.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Center Hub */}
              <div className="absolute w-[56px] h-[56px] bg-white rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] flex items-center justify-center">
                <div className="w-[34px] h-[34px] bg-imageBg rounded-full border border-imageBorder"></div>
              </div>
            </div>
          </div>

          {/* Controls & Info */}
          <div className="mt-6 text-center">
            <p className="text-textDark text-[14px] mb-3">
              Kesempatan Tersisa:{' '}
              <span className="text-[#d6392c] font-bold">{ticketLabel}</span>
            </p>
            <button
              type="button"
              onClick={handleSpin}
              disabled={spinning || loading || !rouletteActive}
              className="bg-[#d6392c] text-white font-bold text-[15px] py-[12px] px-[48px] rounded-full shadow-sm hover:bg-red-700 transition-colors disabled:opacity-60"
            >
              {!rouletteActive
                ? 'Roulette Tidak Aktif'
                : spinning
                  ? 'Memutar...'
                  : 'Putar Sekarang'}
            </button>
          </div>
        </div>
      </section>

      {/* Cara Mendapatkan Tiket — mengikuti konfigurasi /api/roulette/earn/ */}
      <section className="bg-background">
        <div className="max-w-md mx-auto px-4 pt-2 pb-4">
          <div className="bg-white rounded-[14px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
            <h3 className="text-textDark font-semibold text-[14px] mb-3">
              Cara Mendapatkan Tiket
            </h3>

            {earnRules.length > 0 ? (
              <div className="flex flex-col gap-3">
                {earnRules.map((rule) => (
                  <div
                    key={rule.key}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-textDark text-[13px] leading-snug">
                      {rule.label}
                    </span>
                    <span className="text-primary font-bold text-[13px] shrink-0">
                      {rule.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-textLight text-[12px] leading-snug">
                Ajak temanmu menjadi tim aktif dan dapatkan putaran tambahan!
              </p>
            )}
          </div>
        </div>
      </section>

      {/* History Section */}
      <section className="bg-background">
        <div className="max-w-md mx-auto px-4 pb-8">
          <div className="bg-white rounded-[14px] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
            <h3 className="text-textDark font-semibold text-[15px] mb-2">
              Riwayat Hadiah
            </h3>

            {history.length === 0 ? (
              <p className="text-textLight text-[13px] text-center py-[14px]">
                Belum ada riwayat putaran. Ayo coba putar roulette!
              </p>
            ) : (
              history.map((item, index) => (
                <div
                  key={index}
                  className={`flex justify-between items-center py-[14px] ${
                    index < history.length - 1
                      ? 'border-b border-borderGray'
                      : ''
                  }`}
                >
                  <span className="text-textDark text-[14px] font-medium">
                    {item.reward}
                  </span>
                  <span className="text-textLight text-[12px]">
                    {item.date}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Error Modal */}
      <ErrorModal
        open={Boolean(error)}
        title="Gagal Memutar"
        message={error}
        onClose={() => setError('')}
      />

      {/* Success Modal */}
      <SuccessModal
        open={showSuccess}
        title="Hasil Putaran"
        message={successMessage}
        onClose={() => setShowSuccess(false)}
      />
    </div>
  )
}

export default RoulettePage
