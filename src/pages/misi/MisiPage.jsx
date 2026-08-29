import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import backIcon from '../../assets/20_1006.svg'
import usersIcon from '../../assets/20_1013.svg'
import check1Icon from '../../assets/20_1034.svg'
import check2Icon from '../../assets/20_1046.svg'
import lock1Icon from '../../assets/20_1071.svg'
import lock2Icon from '../../assets/20_1084.svg'
import lock3Icon from '../../assets/20_1097.svg'
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

const checkIcons = [check1Icon, check2Icon]
const lockIcons = [lock1Icon, lock2Icon, lock3Icon]

// Format reward → "+Rp15.000"
const formatReward = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return `+Rp${String(value)}`
  return `+Rp${num.toLocaleString('id-ID')}`
}

// Konversi nilai string/bool dari API → boolean
const toBool = (value) =>
  value === true ||
  value === 'true' ||
  value === 'True' ||
  value === 1 ||
  value === '1'

function MisiPage({ onBackClick }) {
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [claimingId, setClaimingId] = useState(null)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const loadMissions = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/missions/`, {
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
        setError(getErrorMessage(data, 'Gagal memuat misi.'))
        return
      }
      setMissions(
        (Array.isArray(data.results) ? data.results : [])
          // Target terkecil tampil paling atas (urutan tingkatan naik)
          .sort((a, b) => Number(a.requirement) - Number(b.requirement)),
      )
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMissions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClaim = async (missionId) => {
    setClaimingId(missionId)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/missions/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ mission_id: missionId, times: 1 }),
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
          getErrorMessage(data, 'Gagal klaim misi.'),
        )
        return
      }
      const amount = Number(data.reward_amount || 0)
      setSuccessMessage(
        data.message ||
          `Reward misi berhasil diklaim! +Rp${Number.isNaN(amount)
            ? 0
            : amount.toLocaleString('id-ID')} masuk ke saldo.`,
      )
      setShowSuccess(true)
      loadMissions()
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
    } finally {
      setClaimingId(null)
    }
  }

  // Status tiap misi dari data API (claimed / claimable / progress / locked)
  const items = missions.map((mission, index) => {
    const claimed = toBool(mission.claimed)
    const canClaim = toBool(mission.can_claim)
    const progress = Number(mission.progress_amount) || 0
    const requirement = Number(mission.requirement) || 0
    const percent =
      requirement > 0 ? Math.min(100, (progress / requirement) * 100) : 0

    let status = 'locked'
    if (claimed) status = 'completed'
    else if (canClaim) status = 'claimable'
    else if (progress > 0) status = 'progress'

    return {
      id: mission.id,
      title: mission.title || 'Misi',
      subtitle:
        status === 'completed'
          ? 'Sudah diklaim'
          : status === 'claimable'
            ? 'Target tercapai, siap diklaim'
            : `${progress} dari ${requirement}`,
      reward: formatReward(mission.reward),
      status,
      progress: Math.round(percent),
      number: String(requirement),
      icon:
        status === 'completed' || status === 'claimable'
          ? checkIcons[index % checkIcons.length]
          : lockIcons[index % lockIcons.length],
    }
  })

  const totalFriends = missions.reduce(
    (max, m) => Math.max(max, Number(m.progress_amount) || 0),
    0,
  )
  const maxRequirement = missions.reduce(
    (max, m) => Math.max(max, Number(m.requirement) || 0),
    0,
  )
  const heroPercent = maxRequirement
    ? Math.min(100, (totalFriends / maxRequirement) * 100)
    : 0

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header Section */}
      <section className="bg-primary flex justify-center sticky top-0 z-50">
        <div className="w-full max-w-md px-4 py-4 flex items-center relative">
          <button
            type="button"
            onClick={onBackClick}
            className="p-2 absolute left-4 hover:bg-white/10 rounded-full transition-colors"
          >
            <img src={backIcon} alt="Back" className="w-4 h-4" />
          </button>
          <h1 className="text-white font-semibold text-base w-full text-center">
            Misi Ajak Teman
          </h1>
        </div>
      </section>

      {/* Hero Section */}
      <section className="bg-primary flex justify-center">
        <div className="w-full max-w-md px-5 pt-6 pb-20 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-white/15 rounded-full flex items-center justify-center mb-4">
            <img src={usersIcon} alt="Users Icon" className="w-7 h-7" />
          </div>
          <h2 className="text-white text-lg font-bold mb-3 leading-snug">
            Semakin Banyak Teman, Semakin Besar
            <br />
            Reward
          </h2>
          <p className="text-[#b7c0dd] text-sm px-2 leading-relaxed">
            Capai target jumlah teman yang diundang untuk membuka reward di
            setiap tingkatan.
          </p>
        </div>
      </section>

      {/* Progress Section */}
      <section className="bg-background flex justify-center">
        <div className="w-full max-w-md px-4 -mt-12 relative z-10">
          <div className="bg-white rounded-[14px] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-textDark text-sm font-medium">
                Total Teman Diundang Sudah Aktif
              </span>
              <span className="text-primary text-sm font-bold">
                {totalFriends} Teman
              </span>
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${heroPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* Rewards Section */}
      <section className="bg-background flex justify-center pb-12">
        <div className="w-full max-w-md px-4 py-6">
          <h3 className="text-textLight text-[11px] font-bold tracking-wider mb-3 ml-2 uppercase">
            Tingkatan Reward
          </h3>

          <div className="bg-white rounded-[14px] px-5 py-2 shadow-sm">
            {loading ? (
              <p className="text-textGray text-sm py-8 text-center">
                Memuat misi...
              </p>
            ) : items.length === 0 ? (
              <p className="text-textGray text-sm py-8 text-center">
                Belum ada misi tersedia.
              </p>
            ) : (
              items.map((item, index) => (
                <div
                  key={item.id ?? item.title}
                  className={`flex items-center py-4 ${
                    index < items.length - 1 ? 'border-b border-borderGray' : ''
                  }`}
                >
                  {/* Icon / Number */}
                  {item.status === 'completed' || item.status === 'claimable' ? (
                    <div className="w-[46px] h-[46px] rounded-full bg-[#2fb380] flex items-center justify-center shrink-0">
                      <img
                        src={item.icon}
                        alt="Completed"
                        className="w-4 h-4"
                      />
                    </div>
                  ) : item.status === 'progress' ? (
                    <div className="w-[46px] h-[46px] rounded-full bg-[#dbe9fb] border-2 border-primary flex items-center justify-center shrink-0">
                      <span className="text-primary font-bold text-sm">
                        {item.number}
                      </span>
                    </div>
                  ) : (
                    <div className="w-[46px] h-[46px] rounded-full bg-background flex items-center justify-center shrink-0">
                      <img src={item.icon} alt="Locked" className="w-4 h-4" />
                    </div>
                  )}

                  {/* Title & Subtitle */}
                  <div className="ml-4 flex-1 pr-2">
                    <h4
                      className={`text-sm font-semibold ${
                        item.status === 'locked'
                          ? 'text-[#b0b4ba]'
                          : 'text-textDark'
                      } ${item.status === 'progress' ? 'mb-1.5' : ''}`}
                    >
                      {item.title}
                    </h4>
                    {item.status === 'progress' && (
                      <div className="h-1.5 bg-background rounded-full overflow-hidden w-full mb-1">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${item.progress}%` }}
                        ></div>
                      </div>
                    )}
                    <p
                      className={`text-textLight ${
                        item.status === 'progress' ? 'text-[11px]' : 'text-xs'
                      } mt-0.5`}
                    >
                      {item.subtitle}
                    </p>
                  </div>

                  {/* Reward Badge / Claim Button */}
                  {item.status === 'claimable' ? (
                    <button
                      type="button"
                      onClick={() => handleClaim(item.id)}
                      disabled={claimingId === item.id}
                      className="bg-[#d6392c] px-4 py-1.5 rounded-full hover:bg-red-700 transition-colors shrink-0 disabled:opacity-60"
                    >
                      <span className="text-white text-xs font-bold">
                        {claimingId === item.id ? 'Memproses...' : 'Klaim'}
                      </span>
                    </button>
                  ) : (
                    <div
                      className={`px-3 py-1 rounded-full shrink-0 ${
                        item.status === 'completed'
                          ? 'bg-[#e0f3e1]'
                          : item.status === 'progress'
                            ? 'bg-[#fdf1ef]'
                            : 'bg-borderGray'
                      }`}
                    >
                      <span
                        className={`text-xs font-bold ${
                          item.status === 'completed'
                            ? 'text-[#2fb380]'
                            : item.status === 'progress'
                              ? 'text-[#d6392c]'
                              : 'text-[#b0b4ba]'
                        }`}
                      >
                        {item.reward}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Error Modal */}
      <ErrorModal
        open={Boolean(error)}
        title="Gagal Klaim Misi"
        message={error}
        onClose={() => setError('')}
      />

      {/* Success Modal */}
      <SuccessModal
        open={showSuccess}
        title="Reward Berhasil Diklaim"
        message={successMessage}
        onClose={() => setShowSuccess(false)}
      />
    </div>
  )
}

export default MisiPage
