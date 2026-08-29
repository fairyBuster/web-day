import { useEffect, useState } from 'react'
import LandingPage from './pages/LandingPage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import DashboardPage from './pages/DashboardPage'
import NewsPage from './pages/news/NewsPage'
import NewsDetailPage from './pages/news/NewsDetailPage'
import DepositPage from './pages/deposit/DepositPage'
import WithdrawPage from './pages/withdraw/WithdrawPage'
import ChangePinPage from './pages/withdraw/ChangePinPage'
import BankAccountPage from './pages/bankaccount/BankAccountPage'
import VoucherPage from './pages/voucher/VoucherPage'
import ProdukPage from './pages/produk/ProdukPage'
import ProdukDetailPage from './pages/produk/ProdukDetailPage'
import MyProductPage from './pages/produk/MyProductPage'
import RiwayatPembelianPage from './pages/produk/RiwayatPembelianPage'
import ProfilePage from './pages/profile/ProfilePage'
import ProfilSayaPage from './pages/profile/ProfilSayaPage'
import UbahKataSandiAkunPage from './pages/profile/UbahKataSandiAkunPage'
import HubungiCsPage from './pages/profile/HubungiCsPage'
import TentangAplikasiPage from './pages/profile/TentangAplikasiPage'
import TeamPage from './pages/team/TeamPage'
import CheckinPage from './pages/checkin/CheckinPage'
import RoulettePage from './pages/roulette/RoulettePage'
import InvitePage from './pages/invite/InvitePage'
import MisiPage from './pages/misi/MisiPage'
import RiwayatTransaksiPage from './pages/transaksi/RiwayatTransaksiPage'
import RiwayatDepositPage from './pages/transaksi/RiwayatDepositPage'
import RiwayatBonusReferralPage from './pages/transaksi/RiwayatBonusReferralPage'
import RiwayatBeliProdukPage from './pages/transaksi/RiwayatBeliProdukPage'
import RiwayatPenarikanPage from './pages/transaksi/RiwayatPenarikanPage'
import RiwayatKeuntunganPage from './pages/transaksi/RiwayatKeuntunganPage'
import RiwayatLainnyaPage from './pages/transaksi/RiwayatLainnyaPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import { getTokenExpiryMs, clearSession } from './utils/session'

// Halaman yang boleh diakses tanpa login
const PUBLIC_PAGES = ['landing', 'login', 'register', 'forgot', 'terms']

const isAuthenticated = () => Boolean(localStorage.getItem('access_token'))

function App() {
  // Pulihkan halaman terakhir agar tidak balik ke landing saat refresh
  const [page, setPage] = useState(() => {
    const saved = localStorage.getItem('app_page')
    if (saved) {
      if (PUBLIC_PAGES.includes(saved)) return saved
      if (isAuthenticated()) {
        // Halaman detail butuh id tersimpan — tanpa id, balik ke daftarnya
        if (saved === 'produk-detail' && !localStorage.getItem('app_product_id'))
          return 'produk'
        if (saved === 'news-detail' && !localStorage.getItem('app_news_id'))
          return 'news'
        return saved
      }
      return 'login'
    }
    return isAuthenticated() ? 'dashboard' : 'landing'
  })
  const [termsOrigin, setTermsOrigin] = useState('landing')
  const [inviteOrigin, setInviteOrigin] = useState('dashboard')
  const [selectedProductId, setSelectedProductId] = useState(() => {
    const saved = localStorage.getItem('app_product_id')
    return saved ? Number(saved) : null
  })
  const [selectedNewsId, setSelectedNewsId] = useState(() => {
    const saved = localStorage.getItem('app_news_id')
    return saved ? Number(saved) : null
  })
  const [bankAccountOrigin, setBankAccountOrigin] = useState('withdraw')
  // Kode referral dari link undangan (#/invite/{kode}) untuk isi otomatis form register
  const [inviteReferralCode, setInviteReferralCode] = useState('')
  // Pesan yang ditampilkan di halaman login setelah sesi otomatis berakhir
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState('')

  // Link undangan: buka #/invite/{kode} → langsung ke register + isi kode referral
  useEffect(() => {
    const match = window.location.hash.match(/^#\/invite\/([A-Za-z0-9_-]+)/)
    if (match?.[1]) {
      setInviteReferralCode(match[1])
      if (!isAuthenticated()) setPage('register')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('app_page', page)
  }, [page])

  // Persist id halaman detail agar tetap terbuka saat refresh
  useEffect(() => {
    if (selectedProductId) {
      localStorage.setItem('app_product_id', String(selectedProductId))
    } else {
      localStorage.removeItem('app_product_id')
    }
  }, [selectedProductId])

  useEffect(() => {
    if (selectedNewsId) {
      localStorage.setItem('app_news_id', String(selectedNewsId))
    } else {
      localStorage.removeItem('app_news_id')
    }
  }, [selectedNewsId])

  // Auto logout saat token akses kedaluwarsa — kembali ke halaman login
  useEffect(() => {
    let timer = null

    const expireSession = () => {
      clearSession()
      setSessionExpiredMessage(
        'Sesi kamu sudah berakhir. Silakan login kembali.',
      )
      setPage('login')
    }

    const scheduleCheck = () => {
      if (!isAuthenticated()) return
      const expMs = getTokenExpiryMs()
      if (expMs === null) return
      const remaining = expMs - Date.now()
      if (remaining <= 0) {
        expireSession()
        return
      }
      // Jadwal ulang saat token kedaluwarsa; paling lambat dicek tiap 60 detik
      // supaya token baru setelah login ulang ikut terpantau.
      timer = setTimeout(scheduleCheck, Math.min(remaining, 60000))
    }

    timer = setTimeout(scheduleCheck, 0)

    // Halaman lain bisa memicu logout langsung saat menerima respons 401
    const onSessionExpired = () => expireSession()
    window.addEventListener('auth:session-expired', onSessionExpired)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('auth:session-expired', onSessionExpired)
    }
  }, [])

  const openTerms = (origin) => {
    setTermsOrigin(origin)
    setPage('terms')
  }

  const openInvite = (origin) => {
    setInviteOrigin(origin)
    setPage('invite')
  }

  const handleLogout = () => {
    clearSession()
    setSessionExpiredMessage('')
    setPage('landing')
  }

  // Auth guard: halaman selain public wajib login — tanpa token diarahkan ke login
  if (!PUBLIC_PAGES.includes(page) && !isAuthenticated()) {
    return (
      <LoginPage
        sessionExpiredMessage={sessionExpiredMessage}
        onRegisterClick={() => setPage('register')}
        onForgotPasswordClick={() => setPage('forgot')}
        onLoginClick={() => {
          setSessionExpiredMessage('')
          setPage('dashboard')
        }}
      />
    )
  }

  if (page === 'login') {
    return (
      <LoginPage
        sessionExpiredMessage={sessionExpiredMessage}
        onRegisterClick={() => setPage('register')}
        onForgotPasswordClick={() => setPage('forgot')}
        onLoginClick={() => {
          setSessionExpiredMessage('')
          setPage('dashboard')
        }}
      />
    )
  }

  if (page === 'dashboard') {
    return (
      <DashboardPage
        onViewMore={() => setPage('news')}
        onNewsClick={(item) => {
          setSelectedNewsId(item?.id ?? null)
          setPage('news-detail')
        }}
        onDepositClick={() => setPage('deposit')}
        onWithdrawClick={() => setPage('withdraw')}
        onVoucherClick={() => setPage('voucher')}
        onProyekClick={() => setPage('produk')}
        onProfileClick={() => setPage('profile')}
        onTeamClick={() => setPage('team')}
        onCheckinClick={() => setPage('checkin')}
        onRouletteClick={() => setPage('roulette')}
        onInviteClick={() => openInvite('dashboard')}
        onMisiClick={() => setPage('misi')}
        onBankAccountClick={() => {
          setBankAccountOrigin('dashboard')
          setPage('bankaccount')
        }}
      />
    )
  }

  if (page === 'misi') {
    return <MisiPage onBackClick={() => setPage('dashboard')} />
  }

  if (page === 'riwayat-transaksi') {
    return (
      <RiwayatTransaksiPage
        onBackClick={() => setPage('profile')}
        onDepositClick={() => setPage('riwayat-deposit')}
        onReferralClick={() => setPage('riwayat-bonus-referral')}
        onBeliClick={() => setPage('riwayat-beli-produk')}
        onPenarikanClick={() => setPage('riwayat-penarikan')}
        onKeuntunganClick={() => setPage('riwayat-keuntungan')}
        onLainnyaClick={() => setPage('riwayat-lainnya')}
      />
    )
  }

  if (page === 'riwayat-deposit') {
    return <RiwayatDepositPage onBackClick={() => setPage('riwayat-transaksi')} />
  }

  if (page === 'riwayat-bonus-referral') {
    return <RiwayatBonusReferralPage onBackClick={() => setPage('riwayat-transaksi')} />
  }

  if (page === 'riwayat-beli-produk') {
    return <RiwayatBeliProdukPage onBackClick={() => setPage('riwayat-transaksi')} />
  }

  if (page === 'riwayat-penarikan') {
    return <RiwayatPenarikanPage onBackClick={() => setPage('riwayat-transaksi')} />
  }

  if (page === 'riwayat-keuntungan') {
    return <RiwayatKeuntunganPage onBackClick={() => setPage('riwayat-transaksi')} />
  }

  if (page === 'riwayat-lainnya') {
    return <RiwayatLainnyaPage onBackClick={() => setPage('riwayat-transaksi')} />
  }

  if (page === 'invite') {
    return (
      <InvitePage
        onBackClick={() => setPage(inviteOrigin)}
        onViewBonusHistory={() => setPage('riwayat-bonus-referral')}
      />
    )
  }

  if (page === 'roulette') {
    return <RoulettePage onBackClick={() => setPage('dashboard')} />
  }

  if (page === 'checkin') {
    return <CheckinPage onBackClick={() => setPage('dashboard')} />
  }

  if (page === 'profile') {
    return (
      <ProfilePage
        onNavigate={(tab) => {
          if (tab === 'home') setPage('dashboard')
          if (tab === 'proyek') setPage('produk')
          if (tab === 'tim') setPage('team')
        }}
        onDepositClick={() => setPage('deposit')}
        onWithdrawClick={() => setPage('withdraw')}
        onChangePinClick={() => setPage('change-pin')}
        onBankClick={() => setPage('bankaccount')}
        onTermsClick={() => openTerms('profile')}
        onInviteClick={() => openInvite('profile')}
        onRiwayatClick={() => setPage('riwayat-transaksi')}
        onProfilSayaClick={() => setPage('profil-saya')}
        onUbahKataSandiClick={() => setPage('ubah-kata-sandi-akun')}
        onHubungiCsClick={() => setPage('hubungi-cs')}
        onTentangAplikasiClick={() => setPage('tentang-aplikasi')}
        onMisiClick={() => setPage('misi')}
        onLogoutClick={handleLogout}
      />
    )
  }

  if (page === 'profil-saya') {
    return <ProfilSayaPage onBackClick={() => setPage('profile')} />
  }

  if (page === 'ubah-kata-sandi-akun') {
    return <UbahKataSandiAkunPage onBackClick={() => setPage('profile')} />
  }

  if (page === 'hubungi-cs') {
    return <HubungiCsPage onBackClick={() => setPage('profile')} />
  }

  if (page === 'tentang-aplikasi') {
    return (
      <TentangAplikasiPage
        onBackClick={() => setPage('profile')}
        onTermsClick={() => openTerms('tentang-aplikasi')}
        onPrivacyClick={() => setPage('privasi')}
      />
    )
  }

  if (page === 'privasi') {
    return <PrivacyPage onBackClick={() => setPage('tentang-aplikasi')} />
  }

  if (page === 'team') {
    return (
      <TeamPage
        onNavigate={(tab) => {
          if (tab === 'home') setPage('dashboard')
          if (tab === 'proyek') setPage('produk')
          if (tab === 'aku') setPage('profile')
        }}
        onViewBonusHistory={() => setPage('riwayat-bonus-referral')}
      />
    )
  }

  if (page === 'produk') {
    return (
      <ProdukPage
        onNavigate={(tab) => {
          if (tab === 'home') setPage('dashboard')
          if (tab === 'tim') setPage('team')
          if (tab === 'aku') setPage('profile')
        }}
        onBeliClick={(product) => {
          setSelectedProductId(product?.id ?? null)
          setPage('produk-detail')
        }}
        onRiwayatClick={() => setPage('riwayat-pembelian')}
        onInviteClick={() => openInvite('produk')}
        onMyProductClick={() => setPage('myproduct')}
      />
    )
  }

  if (page === 'produk-detail') {
    return (
      <ProdukDetailPage
        productId={selectedProductId}
        onBackClick={() => setPage('produk')}
      />
    )
  }

  if (page === 'riwayat-pembelian') {
    return (
      <RiwayatPembelianPage
        onBackClick={() => setPage('produk')}
        onDetailClick={() => setPage('myproduct')}
      />
    )
  }

  if (page === 'myproduct') {
    return <MyProductPage onBackClick={() => setPage('produk')} />
  }

  if (page === 'voucher') {
    return <VoucherPage onBackClick={() => setPage('dashboard')} />
  }

  if (page === 'deposit') {
    return <DepositPage onBackClick={() => setPage('dashboard')} />
  }

  if (page === 'withdraw') {
    return (
      <WithdrawPage
        onBackClick={() => setPage('dashboard')}
        onAddBankAccount={() => {
          setBankAccountOrigin('withdraw')
          setPage('bankaccount')
        }}
        onEditPin={() => setPage('change-pin')}
      />
    )
  }

  if (page === 'change-pin') {
    return <ChangePinPage onBackClick={() => setPage('withdraw')} />
  }

  if (page === 'bankaccount') {
    return (
      <BankAccountPage onBackClick={() => setPage(bankAccountOrigin)} />
    )
  }

  if (page === 'news') {
    return (
      <NewsPage
        onBackClick={() => setPage('dashboard')}
        onArticleClick={(item) => {
          setSelectedNewsId(item?.id ?? null)
          setPage('news-detail')
        }}
      />
    )
  }

  if (page === 'news-detail') {
    return (
      <NewsDetailPage
        newsId={selectedNewsId}
        onBackClick={() => setPage('news')}
      />
    )
  }

  if (page === 'register') {
    return (
      <RegisterPage
        initialReferralCode={inviteReferralCode}
        onLoginClick={() => setPage('login')}
        onTermsClick={() => openTerms('register')}
      />
    )
  }

  if (page === 'forgot') {
    return <ForgotPasswordPage onBackClick={() => setPage('login')} />
  }

  if (page === 'terms') {
    return <TermsPage onBackClick={() => setPage(termsOrigin)} />
  }

  return (
    <LandingPage
      onLoginClick={() => setPage('login')}
      onRegisterClick={() => setPage('register')}
      onTermsClick={() => openTerms('landing')}
    />
  )
}

export default App
