import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import backIcon from '../../assets/19_784.svg'
import inviteIcon from '../../assets/51_114.svg'
import memberIcon from '../../assets/21_1218.svg'
import ErrorModal from '../../components/ErrorModal'

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

// Format nominal tanpa singkatan — angka penuh, tanpa prefix Rp
const formatMoney = (num) => {
  const n = Number(num) || 0
  return n.toLocaleString('id-ID')
}

const bonusLevels = [
  {
    level: 'L1',
    text: 'Teman langsung yang kamu ajak: ',
    bold: '20% dari investasi pertama',
  },
  {
    level: 'L2',
    text: 'Teman dari temanmu: ',
    bold: '2% dari investasi pertama',
  },
  {
    level: 'L3',
    text: 'Jaringan level 3: ',
    bold: '1% dari investasi pertama',
  },
]

function InvitePage({ onBackClick, onViewBonusHistory }) {
  const [stats, setStats] = useState([
    { label: 'Total Diundang', value: '0' },
    { label: 'Sudah Investasi', value: '0' },
    { label: 'Total Bonus', value: 'Rp0' },
  ])
  const [loadingStats, setLoadingStats] = useState(true)
  const [statsError, setStatsError] = useState('')
  const [friends, setFriends] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(true)
  const [friendsError, setFriendsError] = useState('')

  // Statistik downline — hanya itungan level 1-3
  useEffect(() => {
    const loadStats = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`${API_BASE}/api/auth/downline-stats/`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        let json
        try {
          json = await res.json()
        } catch (parseErr) {
          setStatsError(
            `Terjadi kesalahan koneksi. Tolong segarkan halamannya.`,
          )
          return
        }
        const data = parseResponse(json)
        if (!res.ok) {
          setStatsError(getErrorMessage(data, 'Gagal memuat statistik undangan.'))
          return
        }
        const levels = Array.isArray(data?.levels) ? data.levels.slice(0, 3) : []
        const sum = (fn) =>
          levels.reduce((acc, lv) => acc + (Number(fn(lv)) || 0), 0)
        setStats([
          { label: 'Total Diundang', value: String(sum((l) => l.members_total)) },
          {
            label: 'Sudah Investasi',
            value: String(sum((l) => l.members_active)),
          },
          {
            label: 'Total Bonus',
            value: formatMoney(
              sum(
                (l) =>
                  (Number(l.profit_commission_amount) || 0) +
                  (Number(l.purchase_commission_amount) || 0),
              ),
            ),
          },
        ])
      } catch (err) {
        setStatsError(
          'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
        )
      } finally {
        setLoadingStats(false)
      }
    }
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Daftar teman yang diundang — real data dari downline level 1-3
  useEffect(() => {
    const loadFriends = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`${API_BASE}/api/auth/downline-overview/`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        let json
        try {
          json = await res.json()
        } catch (parseErr) {
          setFriendsError(
            'Terjadi kesalahan koneksi. Tolong segarkan halamannya.'
          )
          return
        }
        const data = parseResponse(json)
        if (!res.ok) {
          setFriendsError(getErrorMessage(data, 'Gagal memuat daftar teman.'))
          return
        }
        const levels = Array.isArray(data?.levels)
          ? data.levels.slice(0, 3)
          : []
        setFriends(
          levels
            .flatMap((lvl) =>
              (lvl.members || []).map((m) => ({ ...m, level: lvl.level })),
            )
            // Investasi terkecil tampil paling atas
            .sort(
              (a, b) =>
                Number(a.total_investment_amount) -
                Number(b.total_investment_amount),
            ),
        )
      } catch (err) {
        setFriendsError(
          'Terjadi kesalahan koneksi. Tolong segarkan halamannya.'
        )
      } finally {
        setLoadingFriends(false)
      }
    }
    loadFriends()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Kode referral asli dari akun (untuk link undangan & tombol salin)
  const [referralCode, setReferralCode] = useState('')
  const [copied, setCopied] = useState('') // 'code' | 'link' | '' (feedback tombol)

  useEffect(() => {
    const loadReferral = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`${API_BASE}/api/auth/account-info/`, {
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
        if (data?.referral_code) setReferralCode(data.referral_code)
      } catch (err) {
        // Abaikan — kode tetap kosong (tampil "Memuat...")
      }
    }
    loadReferral()
  }, [])

  // Ambil frontend_url dari settings publik (domain link undangan)
  const [frontendUrl, setFrontendUrl] = useState('')

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/settings/`, {
          headers: { 'Content-Type': 'application/json' },
        })
        if (!res.ok) return
        let json
        try {
          json = await res.json()
        } catch (parseErr) {
          return
        }
        const data = parseResponse(json)
        if (data?.frontend_url) setFrontendUrl(data.frontend_url)
      } catch (err) {
        // Abaikan — pakai fallback domain default
      }
    }
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const code = referralCode
  const inviteLink = `${(frontendUrl || 'https://petroilandgas.com').replace(/\/$/, '')}/#/invite/${code}`
  const waShareUrl = code
    ? `https://wa.me/?text=${encodeURIComponent(
        `Ayo gabung dan dapatkan bonus! Gunakan kode referral saya: ${code} — ${inviteLink}`,
      )}`
    : ''

  const handleCopy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      // Fallback: textarea tersembunyi untuk browser tanpa izin clipboard
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(key)
    window.setTimeout(() => setCopied(''), 2000)
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Hero Section */}
      <section className="bg-background">
        <div className="max-w-md mx-auto bg-primary text-white pb-32 pt-4 px-4">
          {/* Header Navigation */}
          <div className="flex items-center justify-between mb-8">
            <button
              type="button"
              onClick={onBackClick}
              className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Go back"
            >
              <img src={backIcon} alt="Back" className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold flex-1 text-center mr-7">
              Undang Teman
            </h1>
          </div>

          {/* Hero Content */}
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-white/15 rounded-full flex items-center justify-center mb-4">
              <img src={inviteIcon} alt="Invite Icon" className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold mb-2">Ajak Teman, Dapat Bonus</h2>
            <p className="text-[#b7c0dd] text-sm max-w-[300px] leading-relaxed">
              Bagikan kode referral kamu dan dapatkan bonus setiap teman yang
              bergabung dan berinvestasi.
            </p>
          </div>
        </div>
      </section>

      {/* Referral Code Section */}
      <section className="bg-backgroun">
        <div className="max-w-md mx-auto px-4 -mt-10 relative z-10">
          <div className="bg-white rounded-[14px] shadow-sm p-5 flex flex-col gap-4">
            {/* Code Display */}
            <div>
              <p className="text-textLight text-xs mb-1.5">Kode Referral Kamu</p>
              <div className="flex justify-between items-center">
                <span className="text-primary font-bold text-xl tracking-widest">
                  {code || 'Memuat...'}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(code, 'code')}
                  disabled={!code}
                  className="bg-primary text-white text-xs px-5 py-2 rounded-lg font-medium hover:bg-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {copied === 'code' ? 'Tersalin!' : 'Salin'}
                </button>
              </div>
            </div>

            <hr className="border-borderGray" />

            {/* Link Display */}
            <div className="flex justify-between items-center gap-4">
              <span className="text-[#6a6d72] text-xs truncate">
                {code ? inviteLink : 'Memuat...'}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(inviteLink, 'link')}
                disabled={!code}
                className="bg-primary text-white text-xs px-5 py-2 rounded-lg font-medium shrink-0 hover:bg-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copied === 'link' ? 'Tersalin!' : 'Salin'}
              </button>
            </div>

            {/* Quick Share Buttons */}
            <div className="flex gap-3 mt-1">
              <button
                type="button"
                onClick={() => window.open(waShareUrl, '_blank')}
                disabled={!code}
                className="flex-1 border border-[#e2e4e8] rounded-lg py-2.5 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-textDark text-xs font-medium">
                  WhatsApp
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy(inviteLink, 'link')}
                disabled={!code}
                className="flex-1 border border-[#e2e4e8] rounded-lg py-2.5 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-textDark text-xs font-medium">
                  {copied === 'link' ? 'Tersalin!' : 'Salin Link'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-background">
        <div className="max-w-md mx-auto px-4 pt-4">
          <div className="bg-white rounded-[14px] py-4 flex justify-between items-center text-center divide-x divide-background shadow-sm">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex-1 flex flex-col gap-1.5 px-1 min-w-0"
              >
                <span className="text-textLight text-[10px] font-medium uppercase tracking-wide">
                  {stat.label}
                </span>
                <span className="text-primary font-bold truncate text-lg">
                  {loadingStats ? '-' : stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bonus Info Section */}
      <section className="bg-background">
        <div className="max-w-md mx-auto px-4 pt-4">
          <div className="bg-white rounded-[14px] p-5 shadow-sm">
            <h3 className="text-textDark font-bold text-sm mb-4">
              Bonus Referral
            </h3>

            <div className="flex flex-col gap-4">
              {bonusLevels.map((bonus, index) => (
                <div
                  key={bonus.level}
                  className={`flex items-start gap-3 ${
                    index < bonusLevels.length - 1
                      ? 'border-b border-borderGray pb-4'
                      : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#dbe9fb] text-primary font-bold text-xs flex items-center justify-center shrink-0">
                    {bonus.level}
                  </div>
                  <p className="text-textDark text-xs leading-relaxed mt-0.5">
                    {bonus.text}
                    <span className="font-bold">{bonus.bold}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Friends List Section */}
      <section className="bg-background pb-8">
        <div className="max-w-md mx-auto px-4 pt-4">
          <div className="bg-white rounded-[14px] p-5 shadow-sm">
            <h3 className="text-textDark font-bold text-sm mb-4">
              Teman yang Diundang
            </h3>

            <div className="flex flex-col gap-4">
              {loadingFriends ? (
                <p className="text-textLight text-sm text-center py-6">
                  Memuat teman yang diundang...
                </p>
              ) : friendsError ? (
                <p className="text-textLight text-sm text-center py-6">
                  {friendsError}
                </p>
              ) : friends.length === 0 ? (
                <p className="text-textLight text-sm text-center py-6">
                  Belum ada teman yang diundang.
                </p>
              ) : (
                friends.map((friend, index) => {
                  const isInvesting = Number(friend.total_investments) > 0
                  return (
                    <div
                      key={`${friend.level}-${friend.username}-${index}`}
                      className={`flex items-center justify-between ${
                        index < friends.length - 1
                          ? 'border-b border-borderGray pb-4'
                          : 'pb-4'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#fbeed4] flex items-center justify-center shrink-0">
                          <img
                            src={memberIcon}
                            alt="Anggota"
                            className="w-5 h-5"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-textDark text-sm font-semibold truncate">
                              {friend.referral_code || friend.username}
                            </span>
                            <span className="bg-[#dbe9fb] text-primary text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">
                              {friend.rank_title || `L${friend.level}`}
                            </span>
                          </div>
                          <span className="text-textLight text-[10px]">
                            {friend.phone}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-black font-bold text-sm">
                          {formatMoney(friend.total_investment_amount)}
                        </span>
                        <span
                          className={`text-[10px] ${
                            isInvesting ? 'text-[#2fb380]' : 'text-[#b0b4ba]'
                          }`}
                        >
                          {isInvesting ? 'Aktif' : 'Belum Investasi'}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={onViewBonusHistory}
              className="w-full mt-4 border border-primary rounded-full py-3.5 text-primary font-bold text-xs text-center hover:bg-gray-50 transition-colors"
            >
              Lihat Komisi yang Saya Dapatkan dari Undangan
            </button>
          </div>
        </div>
      </section>

      {/* Error Modal untuk statistik undangan */}
      <ErrorModal
        open={Boolean(statsError)}
        title="Gagal Memuat Statistik"
        message={statsError}
        onClose={() => setStatsError('')}
      />
    </div>
  )
}

export default InvitePage