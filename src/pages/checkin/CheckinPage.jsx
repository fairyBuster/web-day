import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import backIcon from '../../assets/18_377.svg'
import check1Icon from '../../assets/18_394.svg'
import check2Icon from '../../assets/18_402.svg'
import check3Icon from '../../assets/18_410.svg'
import check4Icon from '../../assets/18_418.svg'
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

const checkIcons = [check1Icon, check2Icon, check3Icon, check4Icon]

const DAY_REWARDS = [
  { label: 'Hari 1', reward: 'Rp1.000' },
  { label: 'Hari 2', reward: 'Rp1.000' },
  { label: 'Hari 3', reward: 'Rp2.000' },
  { label: 'Hari 4', reward: 'Rp2.000' },
  { label: 'Hari 5', reward: 'Rp3.000' },
  { label: 'Hari 6', reward: 'Rp3.000' },
  { label: 'Hari 7', reward: 'Rp5.000' },
  { label: 'Bonus', reward: 'Rp10.000' },
]

function CheckinPage({ onBackClick }) {
  const [streakData, setStreakData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const loadStreak = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/attendance/logs/streak/`, {
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
        setError(getErrorMessage(data, 'Gagal memuat data absen.'))
        return
      }
      setStreakData(data)
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStreak()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClaim = async () => {
    if (streakData?.has_claimed_today || !streakData?.can_claim_today) return
    setClaiming(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/attendance/logs/claim/`, {
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
          `Terjadi kesalahan koneksi. Tolong segarkan halamannya.`,
        )
        return
      }
      const data = parseResponse(json)
      if (!res.ok) {
        setError(
          getErrorMessage(data, 'Gagal klaim absen. Pastikan belum klaim hari ini.'),
        )
        return
      }
      const amount = Number(data.claimed_amount ?? data.log?.amount ?? 0)
      const claimStreak = Number(data.streak ?? data.log?.streak_count ?? 0)
      setSuccessMessage(
        data.detail ||
          (amount > 0
            ? `Absen berhasil! Klaim Rp${amount.toLocaleString(
                'id-ID',
              )} (streak ${claimStreak} hari).`
            : `Absen berhasil dicatat (streak ${claimStreak} hari).`),
      )
      setShowSuccess(true)
      loadStreak()
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
    } finally {
      setClaiming(false)
    }
  }

  // Status tiap sel grid (Hari 1..7 + Bonus):
  // - Mode daily: hijau ditentukan per tanggal dari program_claim_dates
  // - Mode lain (fixed/random/rank): hijau sebanyak streak dari API
  const datePlusDays = (dateStr, days) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
  }
  const startDate = streakData?.program_start_date
  const claimDates = Array.isArray(streakData?.program_claim_dates)
    ? streakData.program_claim_dates
    : []
  const todayIndex = Number(streakData?.cycle_day) || 0 // posisi hari ini (1-based)
  const useDateBased =
    typeof startDate === 'string' &&
    startDate.length === 10 &&
    claimDates.length > 0
  const claimedCount = Math.min(
    DAY_REWARDS.length,
    Number(streakData?.streak) || 0,
  )
  const days = DAY_REWARDS.map((day, index) => {
    let status = 'upcoming'
    const isBonus = index === DAY_REWARDS.length - 1
    const isClaimed = useDateBased
      ? isBonus
        ? claimDates.length >= 7
        : claimDates.includes(datePlusDays(startDate, index))
      : isBonus
        ? claimedCount >= 7
        : index < claimedCount
    if (isClaimed) status = 'completed'
    else if (streakData?.can_claim_today) {
      const isCurrent = useDateBased
        ? index === todayIndex - 1
        : index === claimedCount
      if (isCurrent) status = 'current'
    }
    return { ...day, status }
  })

  const hasClaimedToday = streakData?.has_claimed_today
  const canClaimToday = streakData?.can_claim_today
  const programCompleted = streakData?.program_completed
  const buttonDisabled =
    claiming || loading || hasClaimedToday || !canClaimToday || programCompleted
  const buttonLabel = claiming
    ? 'Memproses...'
    : hasClaimedToday
      ? 'Sudah Absen Hari Ini'
      : programCompleted
        ? 'Program Selesai'
        : 'Absen Sekarang'

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header Section */}
      <section className="bg-primary max-w-md mx-auto">
        <div className="flex items-center px-4 py-4">
          <button
            type="button"
            onClick={onBackClick}
            className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <img src={backIcon} alt="Back" className="w-4 h-4" />
          </button>
          <h1 className="flex-1 text-center text-white font-semibold text-lg pr-6">
            Absen Harian
          </h1>
        </div>
      </section>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary to-[#1c3080] max-w-md mx-auto">
        <div className="pt-6 pb-20 px-5 flex flex-col items-center">
          <p className="text-[#b7c0dd] text-sm mb-1">Absen Berturut-turut</p>
          <div className="flex items-baseline gap-1">
            <span className="text-white text-4xl font-bold">
              {loading ? '0' : streakData?.streak ?? 0}
            </span>
            <span className="text-[#b7c0dd] text-sm">Hari</span>
          </div>
        </div>
      </section>

      {/* Check-in Section */}
      <section className="max-w-md mx-auto bg-background">
        <div className="px-4 -mt-12 relative z-10">
          <div className="bg-white rounded-2xl p-5 shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex flex-col gap-5">
            {/* 4x2 Grid for Days */}
            <div className="grid grid-cols-4 gap-2">
              {days.map((day, index) => (
                <div
                  key={day.label}
                  className={`rounded-xl py-3 px-1 flex flex-col items-center gap-1.5 ${
                    day.status === 'completed'
                      ? 'bg-[#e0f3e1]'
                      : day.status === 'current'
                        ? 'bg-[#dbe9fb] border border-primary'
                        : 'bg-[#f7f8fa]'
                  }`}
                >
                  <span
                    className={`text-xs font-medium ${
                      day.status === 'upcoming' ? 'text-[#6a6d72]' : 'text-textDark'
                    }`}
                  >
                    {day.label}
                  </span>
                  {day.status === 'completed' ? (
                    <div className="w-7 h-7 bg-[#2fb380] rounded-full flex items-center justify-center">
                      <img
                        src={checkIcons[index % checkIcons.length]}
                        alt="Check"
                        className="w-3.5 h-3.5"
                      />
                    </div>
                  ) : (
                    <div className="w-7 h-7 bg-imageBg rounded-full border border-imageBorder"></div>
                  )}
                  <span
                    className={`text-[10px] font-semibold ${
                      day.status === 'upcoming' ? 'text-textGray' : 'text-primary'
                    }`}
                  >
                    {day.reward}
                  </span>
                </div>
              ))}
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handleClaim}
              disabled={buttonDisabled}
              className="w-full bg-primary hover:bg-[#1c3080] transition-colors text-white font-semibold py-3.5 rounded-full text-sm disabled:opacity-60"
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      </section>

      {/* Rules Section */}
      <section className="max-w-md mx-auto bg-background">
        <div className="px-4 mt-4 pb-8">
          <div className="bg-white rounded-2xl py-4 px-5 flex flex-col gap-2">
            <h3 className="text-textDark font-semibold text-sm">
              Ketentuan Absen
            </h3>
            <p className="text-[#6a6d72] text-xs leading-relaxed">
              Lakukan absen setiap hari untuk mendapatkan bonus harian sesuai
              urutan yang berlaku. Jika absen terlewat satu hari, hitungan absen
              berturut-turut akan diulang kembali dari Hari 1. Bonus dapat
              diklaim setelah absen berhasil dilakukan.
            </p>
          </div>
        </div>
      </section>

      {/* Error Modal */}
      <ErrorModal
        open={Boolean(error)}
        title="Gagal Absen"
        message={error}
        onClose={() => setError('')}
      />

      {/* Success Modal */}
      <SuccessModal
        open={showSuccess}
        title="Absen Berhasil"
        message={successMessage}
        onClose={() => setShowSuccess(false)}
      />
    </div>
  )
}

export default CheckinPage
