import { useEffect, useState } from 'react'
import avatarImg from '../../assets/6599a1a542c3a2fd08343a2ebac01e9ee2c2e144.png'
import depositIcon from '../../assets/24_2663.svg'
import withdrawIcon from '../../assets/24_2670.svg'
import riwayatIcon from '../../assets/24_2677.svg'
import undangIcon from '../../assets/24_2684.svg'
import starIcon from '../../assets/24_2709.svg'
import profilIcon from '../../assets/24_2720.svg'
import arrowProfil from '../../assets/24_2725.svg'
import passwordIcon from '../../assets/24_2729.svg'
import arrowPassword from '../../assets/24_2734.svg'
import txnIcon from '../../assets/24_2738.svg'
import arrowTxn from '../../assets/24_2743.svg'
import bankIcon from '../../assets/24_2747.svg'
import arrowBank from '../../assets/24_2752.svg'
import historyIcon from '../../assets/24_2759.svg'
import arrowHistory from '../../assets/24_2764.svg'
import inviteIcon from '../../assets/24_2768.svg'
import arrowInvite from '../../assets/24_2775.svg'
import csIcon from '../../assets/24_2791.svg'
import arrowCs from '../../assets/24_2795.svg'
import tncIcon from '../../assets/24_2799.svg'
import arrowTnc from '../../assets/24_2804.svg'
import aboutIcon from '../../assets/24_2808.svg'
import arrowAbout from '../../assets/24_2813.svg'
import logoutIcon from '../../assets/24_2818.svg'
import rumahIcon from '../../assets/24_2831.svg'
import proyekIcon from '../../assets/24_2837.svg'
import timIcon from '../../assets/24_2843.svg'
import akuIcon from '../../assets/24_2851.svg'
import BottomNav from '../../components/BottomNav'

// Sensor nomor HP: +62 <3 digit>xxxx<4 digit akhir> (contoh: +62 812xxxx7781)
const maskPhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length <= 7) return String(phone || '')
  const hasCountryCode = digits.startsWith('62') && digits.length > 10
  const head = hasCountryCode ? `+62 ${digits.slice(2, 5)}` : digits.slice(0, 3)
  return `${head}xxxx${digits.slice(-4)}`
}

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

// Format angka tanpa prefix Rp (mis. "1.350.000") — untuk statistik agar tidak mepet
const formatNumber = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  return num.toLocaleString('id-ID', { maximumFractionDigits: 0 })
}

const navIcons = {
  home: rumahIcon,
  proyek: proyekIcon,
  tim: timIcon,
  aku: akuIcon,
}

const quickActions = [
  { label: 'Deposit', icon: depositIcon, bg: 'bg-[#dbe9fb]', action: 'deposit' },
  { label: 'Penarikan', icon: withdrawIcon, bg: 'bg-[#fbe0dd]', action: 'withdraw' },
  { label: 'Riwayat', icon: riwayatIcon, bg: 'bg-[#e0f3e1]', action: 'riwayat' },
  { label: 'Undang', icon: undangIcon, bg: 'bg-[#fbeed4]', action: 'invite' },
]

const menuGroups = [
  {
    title: 'Akun',
    items: [
      { label: 'Profil saya', icon: profilIcon, arrow: arrowProfil, bg: 'bg-[#dbe9fb]', action: 'profil' },
      { label: 'Ubah Kata Sandi Akun', icon: passwordIcon, arrow: arrowPassword, bg: 'bg-[#fbeed4]', action: 'change-password' },
      { label: 'Ubah Kata Sandi Transaksi', icon: txnIcon, arrow: arrowTxn, bg: 'bg-[#fbe0dd]', action: 'change-pin' },
      { label: 'Rekening Bank', icon: bankIcon, arrow: arrowBank, bg: 'bg-[#e0f3e1]', action: 'bank' },
    ],
  },
  {
    title: 'Aktivitas',
    items: [
      { label: 'Riwayat Transaksi', icon: historyIcon, arrow: arrowHistory, bg: 'bg-[#dbe9fb]', action: 'riwayat' },
      { label: 'Undang Teman', icon: inviteIcon, arrow: arrowInvite, bg: 'bg-[#e0f3e1]', action: 'invite' },
    ],
  },
  {
    title: 'Lainnya',
    items: [
      { label: 'Hubungi CS', icon: csIcon, arrow: arrowCs, bg: 'bg-[#dbe9fb]', action: 'contact-support' },
      { label: 'Syarat & Ketentuan', icon: tncIcon, arrow: arrowTnc, bg: 'bg-[#e0f3e1]', action: 'terms' },
      { label: 'Tentang Aplikasi', icon: aboutIcon, arrow: arrowAbout, bg: 'bg-[#fbeed4]', action: 'about-app' },
    ],
  },
]

function ProfilePage({
  onNavigate,
  onDepositClick,
  onWithdrawClick,
  onChangePinClick,
  onBankClick,
  onTermsClick,
  onInviteClick,
  onRiwayatClick,
  onProfilSayaClick,
  onUbahKataSandiClick,
  onHubungiCsClick,
  onTentangAplikasiClick,
  onMisiClick,
  onLogoutClick,
}) {
  const handleAction = (action) => {
    if (action === 'profil') onProfilSayaClick?.()
    if (action === 'change-password') onUbahKataSandiClick?.()
    if (action === 'contact-support') onHubungiCsClick?.()
    if (action === 'about-app') onTentangAplikasiClick?.()
    if (action === 'deposit') onDepositClick?.()
    if (action === 'withdraw') onWithdrawClick?.()
    if (action === 'change-pin') onChangePinClick?.()
    if (action === 'bank') onBankClick?.()
    if (action === 'terms') onTermsClick?.()
    if (action === 'invite') onInviteClick?.()
    if (action === 'riwayat') onRiwayatClick?.()
  }

  // Progres menuju rank berikutnya (deposit sendiri vs target deposit rank berikutnya)
  const [rankStatus, setRankStatus] = useState(null)

  useEffect(() => {
    const loadRankStatus = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`${API_BASE}/api/auth/rank-status/`, {
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
        setRankStatus(data)
      } catch (err) {
        // Abaikan — bar tetap tampil dengan nilai fallback
      }
    }
    loadRankStatus()
  }, [])

  // Akun: saldo tersedia & saldo isi ulang dari account-info
  const [accountInfo, setAccountInfo] = useState(null)

  useEffect(() => {
    const loadAccountInfo = async () => {
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
        setAccountInfo(data)
      } catch (err) {
        // Abaikan — saldo tetap tampil dengan nilai fallback
      }
    }
    loadAccountInfo()
  }, [])

  // Basis progres rank mengikuti konfigurasi backend (GeneralSetting) —
  // di sini "downline aktif", bukan deposit Rp. Basis dipilih dari yang
  // syaratnya tidak nol (prioritas: misi → downline total → downline aktif →
  // deposit sendiri → deposit tim L1), fallback terakhir: deposit sendiri.
  const rankBases = [
    { progressKey: 'completed_missions', requiredKey: 'next_required_missions' },
    { progressKey: 'downlines_total', requiredKey: 'next_required_downlines_total' },
    { progressKey: 'downlines_active', requiredKey: 'next_required_downlines_active' },
    { progressKey: 'deposit_self_total', requiredKey: 'next_required_deposit_self_total' },
    { progressKey: 'team_deposit_level_1_total', requiredKey: 'next_required_team_deposit_level_1_total' },
  ]
  const rankBase = rankStatus
    ? rankBases.find((b) => b.progressKey === rankStatus.progress_basis) ||
      rankBases.find((b) => Number(rankStatus[b.requiredKey]) > 0) ||
      rankBases[3]
    : null
  const rankProgress = rankBase
    ? Number(rankStatus?.[rankBase.progressKey]) || 0
    : 0
  const rankTarget = rankBase
    ? Number(rankStatus?.[rankBase.requiredKey]) || 0
    : 0
  const rankPercent =
    rankTarget > 0 ? Math.min(100, (rankProgress / rankTarget) * 100) : 0
  const nextRankTitle = rankStatus?.next_title || 'Rank'

  // Basis hitungan (misi/downline) tampil angka biasa; basis uang (deposit) pakai Rp
  const rankProgressText = rankStatus
    ? rankStatus.next_title
      ? rankBase
        ? rankBase.requiredKey.includes('deposit')
          ? `${formatPrice(rankProgress)} / ${formatPrice(rankTarget)}`
          : `${rankProgress} / ${rankTarget}`
        : 'Memuat...'
      : 'Rank tertinggi tercapai'
    : 'Memuat...'

  // Statistik profil: Total Proyek (investasi), Total Tim & Total Komisi (downline)
  const [teamStats, setTeamStats] = useState(null) // null = belum termuat
  const [totalProject, setTotalProject] = useState(null)

  // Total Tim + Total Komisi dari downline-overview
  useEffect(() => {
    const loadTeamStats = async () => {
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
          return
        }
        const data = parseResponse(json)
        if (!res.ok) return
        setTeamStats({
          totalMembers: Number(data.total_members) || 0,
          totalCommission:
            (Number(data.total_profit_commission) || 0) +
            (Number(data.total_purchase_commission) || 0),
        })
      } catch (err) {
        // Abaikan — statistik tetap tampil dengan nilai fallback
      }
    }
    loadTeamStats()
  }, [])

  // Total Proyek = jumlah semua total_amount di semua halaman investasi
  useEffect(() => {
    const loadTotalProject = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
        let pageNum = 1
        let total = 0
        for (;;) {
          const res = await fetch(
            `${API_BASE}/api/investments/?page=${pageNum}`,
            { headers },
          )
          let json
          try {
            json = await res.json()
          } catch (parseErr) {
            return
          }
          const data = parseResponse(json)
          if (!res.ok) return
          // Endpoint bisa balikin {results: [...]} (paginated) atau array polos
          const list = Array.isArray(data.results)
            ? data.results
            : Array.isArray(data)
              ? data
              : []
          total += list.reduce(
            (sum, item) => sum + (Number(item.total_amount) || 0),
            0,
          )
          if (!data.next || list.length === 0) break
          pageNum += 1
        }
        setTotalProject(total)
      } catch (err) {
        // Abaikan — statistik tetap tampil dengan nilai fallback
      }
    }
    loadTotalProject()
  }, [])

  return (
    <div className="min-h-screen bg-background font-sans pb-28">
      {/* Header Section */}
      <section className="max-w-md mx-auto bg-primary pt-10 pb-14 px-5">
        {/* Profile Info Row */}
        <div className="flex items-center gap-4 mb-8">
          <img
            src={avatarImg}
            alt="User Avatar"
            className="w-[60px] h-[60px] rounded-full object-cover"
          />
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-lg leading-none">
                {accountInfo?.phone
                  ? maskPhone(accountInfo.phone)
                  : 'Memuat...'}
              </span>
              <span className="bg-[#ffd88a] text-primary text-[11px] font-bold px-2.5 py-0.5 rounded-full leading-none">
                {accountInfo?.rank_title || 'Rank'}
              </span>
            </div>
            <span className="text-[#b7c0dd] text-[14px] leading-none">
              {accountInfo
                ? accountInfo.referral_by_phone
                  ? `${maskPhone(accountInfo.referral_by_phone)} adalah pengundang saya`
                  : 'Belum ada pengundang'
                : 'Memuat...'}
            </span>
          </div>
        </div>

        {/* Rank Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-end mb-2.5">
            <span className="text-white text-[13px] leading-none">
              {rankStatus?.next_title ? (
                <>
                  Menuju{' '}
                  <span className="font-bold text-[#ffd88a]">
                    {nextRankTitle}
                  </span>
                </>
              ) : (
                'Rank Tertinggi'
              )}
            </span>
            <span className="text-[#b7c0dd] text-[13px] leading-none">
              {rankProgressText}
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#ffd88a] rounded-full transition-all duration-500"
              style={{ width: `${rankPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Key Stats Card */}
        <div className="bg-white/10 rounded-2xl p-4 flex items-center">
          <div className="flex-1 flex flex-col gap-1.5 pl-2">
            <span className="text-[#b7c0dd] text-[11px] leading-none">
              Saldo tersedia
            </span>
            <span className="text-white font-bold text-[15px] leading-none">
              {accountInfo ? formatPrice(accountInfo.balance) : 'Memuat...'}
            </span>
          </div>
          <div className="w-px h-8 bg-white/15 mx-2"></div>
          <div className="flex-1 flex flex-col gap-1.5 pl-4">
            <span className="text-[#b7c0dd] text-[11px] leading-none">
              Saldo isi ulang
            </span>
            <span className="text-white font-bold text-[15px] leading-none">
              {accountInfo
                ? formatPrice(accountInfo.balance_deposit)
                : 'Memuat...'}
            </span>
          </div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="max-w-md mx-auto bg-backgroud px-4">
        <div className="bg-white rounded-2xl shadow-[0_4px_16px_rgba(13,27,76,0.05)] p-4 flex justify-between items-center -mt-6 relative z-10">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => handleAction(action.action)}
              className="flex flex-col items-center gap-2 w-[72px]"
            >
              <div
                className={`w-[46px] h-[46px] ${action.bg} rounded-[14px] flex items-center justify-center`}
              >
                <img
                  src={action.icon}
                  alt={`${action.label} Icon`}
                  className="w-5 h-5"
                />
              </div>
              <span className="text-textGray text-[13px]">{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-md mx-auto bg-background px-4 pt-4">
        <div className="bg-white rounded-2xl shadow-[0_4px_16px_rgba(13,27,76,0.05)] py-4 flex items-center divide-x divide-borderGray">
          <div className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-textLight text-[11px]">Total Proyek</span>
            <span className="text-primary font-bold text-[16px]">
              {totalProject !== null ? formatNumber(totalProject) : 'Memuat...'}
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-textLight text-[11px]">Total Tim</span>
            <span className="text-primary font-bold text-[16px]">
              {teamStats ? teamStats.totalMembers : 'Memuat...'}
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-textLight text-[11px]">Total Komisi</span>
            <span className="text-primary font-bold text-[16px]">
              {teamStats ? formatNumber(teamStats.totalCommission) : 'Memuat...'}
            </span>
          </div>
        </div>
      </section>

      {/* VIP Banner Section */}
      <section className="max-w-md mx-auto bg-background px-4 pt-4">
        <button
          type="button"
          onClick={onMisiClick}
          className="w-full bg-gradient-to-r from-[#fff4e0] to-[#fbeed4] rounded-2xl p-4 flex items-center gap-3.5 text-left hover:opacity-90 transition-opacity"
        >
          <div className="w-9 h-9 bg-[#ffd88a] rounded-[10px] flex items-center justify-center shrink-0">
            <img src={starIcon} alt="Star Icon" className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-textDark font-bold text-[14px] leading-tight">
              Naik ke VIP selanjutnya dan dapatkan bonus!
            </h3>
            <p className="text-[#6a4f16] text-[12px] leading-snug pr-4">
              Bonus akan diberikan setelah kamu berhasil mencapai level ini!
            </p>
          </div>
        </button>
      </section>

      {/* Menus Section */}
      <section className="max-w-md mx-auto bg-background px-4 pt-6">
        {menuGroups.map((group) => (
          <div key={group.title} className="mb-6">
            <h4 className="text-textLight text-[13px] font-medium px-1 mb-3 uppercase tracking-wide">
              {group.title}
            </h4>
            <div className="bg-white rounded-2xl flex flex-col shadow-[0_4px_16px_rgba(13,27,76,0.05)]">
              {group.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleAction(item.action)}
                  className="flex items-center justify-between p-4 border-b border-borderGray last:border-0"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-9 h-9 ${item.bg} rounded-[10px] flex items-center justify-center`}
                    >
                      <img
                        src={item.icon}
                        alt={`${item.label} Icon`}
                        className="w-[18px] h-[18px]"
                      />
                    </div>
                    <span className="text-textDark text-[15px]">
                      {item.label}
                    </span>
                  </div>
                  <img
                    src={item.arrow}
                    alt="Arrow Right"
                    className="w-[18px] h-[18px]"
                  />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Logout Button */}
        <button
          type="button"
          onClick={onLogoutClick}
          className="w-full bg-white rounded-2xl shadow-[0_4px_16px_rgba(13,27,76,0.05)] p-4 flex items-center gap-3.5"
        >
          <div className="w-9 h-9 bg-[#fbe0dd] rounded-[10px] flex items-center justify-center">
            <img src={logoutIcon} alt="Logout Icon" className="w-[18px] h-[18px]" />
          </div>
          <span className="text-[#d6392c] text-[15px] font-medium">Keluar</span>
        </button>
      </section>

      {/* Bottom Navigation */}
      <BottomNav active="aku" onNavigate={onNavigate} icons={navIcons} />
    </div>
  )
}

export default ProfilePage
