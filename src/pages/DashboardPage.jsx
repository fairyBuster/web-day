import { useEffect, useState } from 'react'
import ApiImage from '../components/ApiImage'
import { getErrorMessage } from '../utils/api'
import ErrorModal from '../components/ErrorModal'
import logoImg from '../assets/6599a1a542c3a2fd08343a2ebac01e9ee2c2e144.png'
import heroImg from '../assets/935654020de96c37559ad0d3b6522af067a28a6a.png'
import banner2Img from '../assets/bg2 (1).png'
import banner3Img from '../assets/bg2 (2).png'
import announcementIcon from '../assets/0161a014add55844e180a5bcae4bd44904a60adf.png'
import fillIcon from '../assets/edfc7b290ec8c91210275533330577ee7db7917f.png'
import withdrawIcon from '../assets/7bc5575834ff1c4082f08a108e3b6903fdbaf26b.png'
import checkinIcon from '../assets/2ff19fdb78b60ef18b97de57971dc87b64fcd737.png'
import rouletteIcon from '../assets/252896d5454203a9f218f6663ba8419833b32656.png'
import cardIcon from '../assets/05defad8909e66b1e2746bc0258cfba0ea5d445e.png'
import inviteIcon from '../assets/1ac98c34854ddf07d9595594236f8ecfacb9bb9b.png'
import taskIcon from '../assets/d08c06da4aaa4646dd60ba2d4c2b8772094cfb02.png'
import voucherIcon from '../assets/6ba253d276542ecf28c5aa95b44179664a025928.png'
import BottomNav from '../components/BottomNav'
import popupCloseIcon from '../assets/33_822.svg'
import popupSuccessIcon from '../assets/33_825.svg'
import waBadgeIcon from '../assets/33_844.svg'
import waArrowIcon from '../assets/33_851.svg'
import communityIcon from '../assets/33_855.svg'
import communityBadgeIcon from '../assets/33_861.svg'
import communityArrowIcon from '../assets/33_868.svg'

const features = [
  { label: 'Isi ulang', icon: fillIcon },
  { label: 'Tarik', icon: withdrawIcon },
  { label: 'Checkin', icon: checkinIcon },
  { label: 'Roulette', icon: rouletteIcon },
  { label: 'Atur kartu', icon: cardIcon },
  { label: 'Invite', icon: inviteIcon },
  { label: 'Tugas', icon: taskIcon },
  { label: 'Tukar voucher', icon: voucherIcon },
]

const banners = [heroImg, banner2Img, banner3Img]

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

// Format tanggal API → "22 Agustus 2026, 08:15"
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

function DashboardPage({
  onViewMore,
  onNewsClick,
  onDepositClick,
  onWithdrawClick,
  onVoucherClick,
  onProyekClick,
  onProfileClick,
  onTeamClick,
  onCheckinClick,
  onRouletteClick,
  onInviteClick,
  onMisiClick,
  onBankAccountClick,
}) {
  const [activeTab, setActiveTab] = useState('home')
  const [news, setNews] = useState([])
  const [loadingNews, setLoadingNews] = useState(true)
  const [error, setError] = useState('')
  const [bannerIndex, setBannerIndex] = useState(0)
  // Popup utama muncul setiap kali menu home diakses (termasuk refresh)
  // Guard history.state mencegah entry menumpuk, jadi back hanya menutup popup
  const [showPopup, setShowPopup] = useState(true)

  // Back browser/HP menutup popup, bukan keluar website
  useEffect(() => {
    if (!showPopup) return undefined
    const handlePopState = () => setShowPopup(false)
    // Hindari entry ganda kalau state popup sudah ada di puncak history
    if (window.history.state?.dashboardPopup) {
      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
    }
    window.history.pushState({ dashboardPopup: true }, '')
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [showPopup])

  const closePopup = () => {
    setShowPopup(false)
    if (window.history.state?.dashboardPopup) window.history.back()
  }
  const [communityLinks, setCommunityLinks] = useState({
    telegram: '',
    community: '',
  })

  // Link grup Telegram & komunitas dari API support links
  useEffect(() => {
    const loadLinks = async () => {
      try {
        // Endpoint publik (AllowAny) — tanpa header auth supaya tidak kena 401
        // saat token lokal sudah kedaluwarsa.
        const res = await fetch(`${API_BASE}/api/support/links/`, {
          headers: {
            'Content-Type': 'application/json',
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
        // Endpoint bisa balikin {results: [...]} (paginated) atau array polos
        const list = Array.isArray(data.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : []
        // Kartu Telegram → link platform 'telegram'; kartu komunitas → link lain
        const tg = list.find(
          (l) =>
            String(l.platform || '').toLowerCase() === 'telegram' &&
            l.is_active !== false,
        )
        const community = list.find(
          (l) =>
            String(l.platform || '').toLowerCase() !== 'telegram' &&
            l.is_active !== false,
        )
        setCommunityLinks({
          telegram: tg?.url || '',
          community: community?.url || '',
        })
      } catch (err) {
        // Abaikan — kartu tetap tampil dengan fallback '#'
      }
    }
    loadLinks()
  }, [])

  const loadNews = async () => {
    try {
      // Endpoint publik (AllowAny) — tanpa header auth supaya tidak kena 401
      // saat token lokal sudah kedaluwarsa.
      const res = await fetch(`${API_BASE}/api/news/`, {
        headers: {
          'Content-Type': 'application/json',
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
        setError(getErrorMessage(data, 'Gagal memuat berita.'))
        return
      }
      const list = Array.isArray(data.results) ? data.results : []
      // Hanya tampilkan 5 berita terbaru di dashboard
      setNews(
        list.slice(0, 5).map((item) => ({
          id: item.id,
          title: item.title || '-',
          date: formatDate(item.published_at),
          image: item.image || '',
        })),
      )
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
    } finally {
      setLoadingNews(false)
    }
  }

  useEffect(() => {
    loadNews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-slide banner
  useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  return (
    <>
      <div className="bg-gray-100 min-h-screen">
      {/* Header Section: Top navigation bar with logo and title */}
      <section className="bg-primary h-[62px] flex items-center px-4 relative w-full max-w-md mx-auto">
        {/* Logo */}
        <div className="w-[34px] h-[34px] rounded-full overflow-hidden z-10">
          <img
            src={logoImg}
            alt="Logo"
            className="w-full h-full object-cover"
          />
        </div>
        {/* Centered Title */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-white font-medium text-base">Home</h1>
        </div>
      </section>

      {/* Hero Section: Sliding banners */}
      <section className="w-full max-w-md mx-auto bg-background">
        <div className="relative w-full h-[206px] overflow-hidden">
          {banners.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={`Banner ${i + 1}`}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                i === bannerIndex ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
          {/* Dots Indicator */}
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 z-10">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Banner ${i + 1}`}
                onClick={() => setBannerIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === bannerIndex ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Announcement Section */}
      <section className="bg-background w-full max-w-md mx-auto px-4 py-3 flex items-center gap-3 overflow-hidden">
        <div className="w-[42px] h-[33px] flex-shrink-0">
          <img
            src={announcementIcon}
            alt="Announcement Icon"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex whitespace-nowrap animate-marquee">
            <p className="text-textDark text-sm pr-10">
              Menggerakkan Energi, Membangun Masa Depan
            </p>
            <p className="text-textDark text-sm pr-10">
              Menggerakkan Energi, Membangun Masa Depan
            </p>
          </div>
        </div>
      </section>

      {/* Features Section: 4x2 grid */}
      <section className="bg-background w-full max-w-md mx-auto px-4 py-4">
        <div className="grid grid-cols-4 gap-y-6 gap-x-2">
          {features.map((feature) => (
            <button
              key={feature.label}
              type="button"
              onClick={() => {
                if (feature.label === 'Isi ulang') onDepositClick?.()
                if (feature.label === 'Tarik') onWithdrawClick?.()
                if (feature.label === 'Tukar voucher') onVoucherClick?.()
                if (feature.label === 'Checkin') onCheckinClick?.()
                if (feature.label === 'Roulette') onRouletteClick?.()
                if (feature.label === 'Invite') onInviteClick?.()
                if (feature.label === 'Tugas') onMisiClick?.()
                if (feature.label === 'Atur kartu') onBankAccountClick?.()
              }}
              className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-12 h-12 rounded-[18px] overflow-hidden">
                <img
                  src={feature.icon}
                  alt={feature.label}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-textGray text-xs text-center">
                {feature.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* News Section */}
      <section className="bg-background w-full max-w-md mx-auto px-4 py-6 pb-24 min-h-screen">
        {/* Tabs */}
        <div className="flex items-center gap-6 mb-4 border-b border-borderGray">
          <button type="button" className="flex flex-col items-center gap-1">
            <span className="text-accent font-medium text-sm">Berita</span>
            <div className="w-full h-[3px] bg-accent rounded-sm"></div>
          </button>
          <button
            type="button"
            onClick={onViewMore}
            className="flex flex-col items-center gap-1 pb-1"
          >
            <span className="text-textLight text-sm">Lebih Banyak</span>
          </button>
        </div>

        {/* News List */}
        <div className="flex flex-col gap-4">
          {loadingNews ? (
            <p className="text-textLight text-sm text-center py-6">
              Memuat berita...
            </p>
          ) : news.length === 0 ? (
            <p className="text-textLight text-sm text-center py-6">
              Belum ada berita.
            </p>
          ) : (
            news.map((item) => (
              <div
                key={item.id}
                onClick={() => onNewsClick?.(item)}
                className="flex justify-between items-start gap-3 py-3 border-b border-borderGray cursor-pointer hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2"
              >
                <div className="flex flex-col gap-2 flex-1">
                  <h3 className="text-textDark text-sm leading-snug line-clamp-2">
                    {item.title}
                  </h3>
                  <span className="text-textLight text-xs">{item.date}</span>
                </div>
                <div className="w-[92px] h-[68px] bg-imageBg border border-imageBorder rounded-lg flex-shrink-0 overflow-hidden">
                  {item.image ? (
                    <ApiImage
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Bottom Navigation */}
      <BottomNav
        active={activeTab}
        onNavigate={(tab) => {
          if (tab === 'proyek') {
            onProyekClick?.()
          } else if (tab === 'aku') {
            onProfileClick?.()
          } else if (tab === 'tim') {
            onTeamClick?.()
          } else {
            setActiveTab(tab)
          }
        }}
      /></div>

      <ErrorModal
        open={Boolean(error)}
        title="Gagal Memuat Berita"
        message={error}
        onClose={() => setError('')}
      />

      {/* Popup Utama: bergabung ke komunitas & grup Telegram */}
      {showPopup ? (
        <div
          onClick={closePopup}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[312px] bg-gradient-to-b from-[#16255e] via-[#0d1b4c] to-[#2a3d8f] rounded-[24px] pt-7 pb-6 px-[22px] flex flex-col items-center relative shadow-2xl"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={closePopup}
              className="absolute top-4 right-4 w-7 h-7 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/25 transition-colors"
              aria-label="Tutup"
            >
              <img src={popupCloseIcon} alt="Close" className="w-3.5 h-3.5" />
            </button>

            {/* Success Icon */}
            <div className="w-[60px] h-[60px] bg-[#e0f3e1] rounded-full flex items-center justify-center shadow-[0_4px_14px_0_rgba(0,0,0,0.2)] mb-4">
              <img
                src={popupSuccessIcon}
                alt="Success"
                className="w-[30px] h-[30px]"
              />
            </div>

            {/* Header Text */}
            <div className="flex flex-col items-center text-center mb-5 w-full">
              <h2 className="text-white font-bold text-[17px] leading-snug mb-1.5">
                Akses Berhasil!
                <br />
                Bergabung di{' '}
                <span className="text-[#ffd88a]">komunitas</span> kami
              </h2>
              <p className="text-[#b7c0dd] text-[11px]">
                Dapatkan info promo dan update terbaru
              </p>
            </div>

            {/* Action Cards */}
            <div className="w-full flex flex-col gap-3 mb-5">
              {/* Telegram Card */}
              <a
                href={communityLinks.telegram || '#'}
                {...(communityLinks.telegram
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
                className="w-full bg-white rounded-2xl py-3.5 px-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="relative w-[46px] h-[46px] shrink-0">
                  <div className="w-full h-full bg-[#229ED9] rounded-full flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="white" aria-hidden="true">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#ffd88a] border-2 border-white rounded-full flex items-center justify-center">
                    <img
                      src={waBadgeIcon}
                      alt="Badge"
                      className="w-2.5 h-2.5"
                    />
                  </div>
                </div>
                <div className="flex flex-col flex-grow">
                  <span className="text-[#1c1c1e] font-bold text-[13px] mb-0.5">
                    Grup Telegram
                  </span>
                  <span className="text-[#9aa0a6] text-[10px]">
                    Info promo & update tercepat
                  </span>
                </div>
                <img
                  src={waArrowIcon}
                  alt="Arrow Right"
                  className="w-4 h-4 shrink-0"
                />
              </a>

              {/* Community Card */}
              <a
                href={communityLinks.community || '#'}
                {...(communityLinks.community
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
                className="w-full bg-white rounded-2xl py-3.5 px-4 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="relative w-[46px] h-[46px] shrink-0">
                  <div className="w-full h-full bg-[#0d1b4c] rounded-full flex items-center justify-center">
                    <img
                      src={communityIcon}
                      alt="Community"
                      className="w-[22px] h-[22px]"
                    />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#ffd88a] border-2 border-white rounded-full flex items-center justify-center">
                    <img
                      src={communityBadgeIcon}
                      alt="Badge"
                      className="w-2.5 h-2.5"
                    />
                  </div>
                </div>
                <div className="flex flex-col flex-grow">
                  <span className="text-[#1c1c1e] font-bold text-[13px] mb-0.5">
                    Komunitas Anggota
                  </span>
                  <span className="text-[#9aa0a6] text-[10px] leading-tight">
                    Diskusi dan berbagi
                    <br />
                    pengalaman
                  </span>
                </div>
                <img
                  src={communityArrowIcon}
                  alt="Arrow Right"
                  className="w-4 h-4 shrink-0"
                />
              </a>
            </div>

            {/* Footer Link */}
            <button
              type="button"
              onClick={closePopup}
              className="text-[#b7c0dd] text-[12px] font-medium hover:text-white transition-colors"
            >
              Lanjut ke Beranda
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default DashboardPage
