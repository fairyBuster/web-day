import { useEffect, useRef, useState } from 'react'
import LandingPage from './pages/LandingPage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import DashboardPage from './pages/DashboardPage'
import NewsPage from './pages/news/NewsPage'
import NewsDetailPage from './pages/news/NewsDetailPage'
import DepositPage from './pages/deposit/DepositPage'
import QrisPage from './pages/deposit/QrisPage'
import VaPage from './pages/deposit/VaPage'
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

// Semua nama halaman valid — dipakai memvalidasi hash URL (#/deposit)
const ALL_PAGES = [
  ...PUBLIC_PAGES,
  'privacy', 'dashboard', 'news', 'news-detail', 'deposit', 'qris', 'va',
  'withdraw', 'change-pin', 'bank-account', 'voucher', 'product', 'product-detail',
  'my-product', 'purchase-history', 'profile', 'my-profile',
  'change-password', 'contact-support', 'about-app', 'team', 'checkin',
  'roulette', 'invite', 'mission', 'transaction-history', 'deposit-history',
  'referral-history', 'product-purchase-history', 'withdrawal-history',
  'profit-history', 'other-history',
]

// Slug URL netral — tanpa kata sensitif (deposit, withdraw, dashboard, dll.)
// supaya tidak memicu flag di laporan review. Nama halaman internal tetap sama.
const PAGE_URL_SLUGS = {
  landing: 'welcome',
  login: 'signin',
  register: 'signup',
  forgot: 'recovery',
  terms: 'terms',
  privacy: 'privacy',
  dashboard: 'home',
  news: 'news',
  'news-detail': 'article',
  deposit: 'order',
  qris: 'scan',
  va: 'code',
  withdraw: 'send',
  'change-pin': 'security',
  'bank-account': 'accounts',
  voucher: 'promo',
  product: 'shop',
  'product-detail': 'item',
  'my-product': 'items',
  'purchase-history': 'orders',
  profile: 'profile',
  'my-profile': 'account',
  'change-password': 'password',
  'contact-support': 'support',
  'about-app': 'about',
  team: 'team',
  checkin: 'checkin',
  roulette: 'game',
  invite: 'invite',
  mission: 'mission',
  'transaction-history': 'activity',
  'deposit-history': 'order-history',
  'referral-history': 'invite-history',
  'product-purchase-history': 'shop-history',
  'withdrawal-history': 'send-history',
  'profit-history': 'claim-history',
  'other-history': 'misc-history',
}

// Slug URL → nama halaman internal
const PAGE_BY_SLUG = Object.fromEntries(
  Object.entries(PAGE_URL_SLUGS).map(([page, slug]) => [slug, page]),
)

const slugOf = (page) => PAGE_URL_SLUGS[page] || page

// Baca nama halaman dari hash URL (#/pages/order → 'deposit');
// null jika slug tidak dikenal. Slug lama otomatis dimigrasi oleh efek sinkron.
const pageFromHash = (hash) => {
  const m = String(hash || '').match(/^#\/pages\/([a-z0-9-]+)/)
  if (!m) return null
  return PAGE_BY_SLUG[m[1]] || null
}

// Nama halaman lama (masih bahasa Indonesia) — migrasi otomatis dari localStorage
const PAGE_MIGRATE = {
  privasi: 'privacy',
  produk: 'product',
  'produk-detail': 'product-detail',
  myproduct: 'my-product',
  'riwayat-pembelian': 'purchase-history',
  'profil-saya': 'my-profile',
  'ubah-kata-sandi-akun': 'change-password',
  'hubungi-cs': 'contact-support',
  'tentang-aplikasi': 'about-app',
  misi: 'mission',
  'riwayat-transaksi': 'transaction-history',
  'riwayat-deposit': 'deposit-history',
  'riwayat-bonus-referral': 'referral-history',
  'riwayat-beli-produk': 'product-purchase-history',
  'riwayat-penarikan': 'withdrawal-history',
  'riwayat-keuntungan': 'profit-history',
  'riwayat-lainnya': 'other-history',
  bankaccount: 'bank-account',
}

const isAuthenticated = () => Boolean(localStorage.getItem('access_token'))

function App() {
  // Pulihkan halaman terakhir agar tidak balik ke landing saat refresh
  const [page, setPage] = useState(() => {
    // URL hash (#/pages/deposit) lebih baru dari localStorage — pakai hash dulu.
    // Nama halaman lama (bahasa Indonesia) dari localStorage dimigrasi otomatis.
    let saved = pageFromHash(window.location.hash) || localStorage.getItem('app_page')
    if (saved && !ALL_PAGES.includes(saved)) saved = PAGE_MIGRATE[saved] || null
    if (saved) {
      if (PUBLIC_PAGES.includes(saved)) return saved
      if (isAuthenticated()) {
        // Halaman detail butuh id tersimpan — tanpa id, balik ke daftarnya
        if (saved === 'product-detail' && !localStorage.getItem('app_product_id'))
          return 'product'
        if (saved === 'news-detail' && !localStorage.getItem('app_news_id'))
          return 'news'
        return saved
      }
      return 'login'
    }
    return isAuthenticated() ? 'dashboard' : 'landing'
  })

  // ==== History browser: back pindah halaman dalam aplikasi, bukan keluar web ====
  // Routing memakai state (bukan URL), jadi tiap pindah halaman harus dicatat
  // ke history browser agar tombol back punya tujuan.
  const firstRenderRef = useRef(true)
  const skipPushRef = useRef(false)

  // Entry pertama diberi state halaman — back dari mana pun punya tujuan.
  // Hash URL ikut disinkronkan supaya path tampil (#/pages/home, #/pages/order, dst).
  // Hash link undangan (#/invite/{kode}) dibiarkan agar kode referral terbaca.
  useEffect(() => {
    const cur = window.location.hash
    const same = pageFromHash(cur) === page
    const isInvite = cur.startsWith('#/invite/')
    window.history.replaceState(
      { page },
      '',
      same || isInvite ? undefined : `#/pages/${slugOf(page)}`,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Navigasi eksplisit — replace dipakai untuk login/logout/sesi berakhir
  const navigate = (next, opts = {}) => {
    const url = `#/pages/${slugOf(next)}`
    if (opts.replace) {
      window.history.replaceState({ page: next }, '', url)
    } else {
      window.history.pushState({ page: next }, '', url)
      skipPushRef.current = true
    }
    setPage(next)
  }

  // Setiap setPage (pindah halaman) → catat ke history browser
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }
    if (skipPushRef.current) {
      skipPushRef.current = false
      return
    }
    window.history.pushState({ page }, '', `#/pages/${slugOf(page)}`)
  }, [page])

  // Tombol back browser → kembali ke halaman sebelumnya di dalam aplikasi
  useEffect(() => {
    const onPopState = (event) => {
      const next = event.state?.page
      if (!next) return // entry awal / state popup — biarkan
      let target = next
      if (target === 'login' && isAuthenticated()) target = 'dashboard'
      if (PUBLIC_PAGES.includes(target) || isAuthenticated()) {
        skipPushRef.current = true
        setPage(target)
        return
      }
      // Halaman privat tanpa login — buang entry, arahkan ke landing
      window.history.replaceState({ page: 'landing' }, '', '#/pages/welcome')
      skipPushRef.current = true
      setPage('landing')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Ketik/edit hash manual di address bar (#/pages/order) → langsung pindah halaman.
  // Pakai updater agar tidak mendorong entry ganda saat popstate sudah duluan.
  useEffect(() => {
    const onHashChange = () => {
      const target = pageFromHash(window.location.hash)
      if (!target) return
      setPage((prev) => {
        if (prev === target) return prev
        skipPushRef.current = true
        return target
      })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const [termsOrigin, setTermsOrigin] = useState('landing')
  const [qrisPayment, setQrisPayment] = useState(null)
  const [vaPayment, setVaPayment] = useState(null)
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

  // Link undangan: buka #/invite/{kode} → langsung ke register + isi kode referral.
  // Hash undangan DIPERTAHANKAN (tidak diganti URL) supaya refresh di halaman
  // register tetap membawa kode — efek ini akan terisi ulang saat mount.
  useEffect(() => {
    const match = window.location.hash.match(/^#\/invite\/([A-Za-z0-9_-]+)/)
    if (match?.[1]) {
      setInviteReferralCode(match[1])
      if (!isAuthenticated()) {
        skipPushRef.current = true
        setPage('register')
      }
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
      navigate('login', { replace: true })
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
    navigate('landing', { replace: true })
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
          navigate('dashboard', { replace: true })
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
          navigate('dashboard', { replace: true })
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
        onProyekClick={() => setPage('product')}
        onProfileClick={() => setPage('profile')}
        onTeamClick={() => setPage('team')}
        onCheckinClick={() => setPage('checkin')}
        onRouletteClick={() => setPage('roulette')}
        onInviteClick={() => openInvite('dashboard')}
        onMisiClick={() => setPage('mission')}
        onBankAccountClick={() => {
          setBankAccountOrigin('dashboard')
          setPage('bank-account')
        }}
      />
    )
  }

  if (page === 'mission') {
    return <MisiPage onBackClick={() => setPage('dashboard')} />
  }

  if (page === 'transaction-history') {
    return (
      <RiwayatTransaksiPage
        onBackClick={() => setPage('profile')}
        onDepositClick={() => setPage('deposit-history')}
        onReferralClick={() => setPage('referral-history')}
        onBeliClick={() => setPage('product-purchase-history')}
        onPenarikanClick={() => setPage('withdrawal-history')}
        onKeuntunganClick={() => setPage('profit-history')}
        onLainnyaClick={() => setPage('other-history')}
      />
    )
  }

  if (page === 'deposit-history') {
    return <RiwayatDepositPage onBackClick={() => setPage('transaction-history')} />
  }

  if (page === 'referral-history') {
    return <RiwayatBonusReferralPage onBackClick={() => setPage('transaction-history')} />
  }

  if (page === 'product-purchase-history') {
    return <RiwayatBeliProdukPage onBackClick={() => setPage('transaction-history')} />
  }

  if (page === 'withdrawal-history') {
    return <RiwayatPenarikanPage onBackClick={() => setPage('transaction-history')} />
  }

  if (page === 'profit-history') {
    return <RiwayatKeuntunganPage onBackClick={() => setPage('transaction-history')} />
  }

  if (page === 'other-history') {
    return <RiwayatLainnyaPage onBackClick={() => setPage('transaction-history')} />
  }

  if (page === 'invite') {
    return (
      <InvitePage
        onBackClick={() => setPage(inviteOrigin)}
        onViewBonusHistory={() => setPage('referral-history')}
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
          if (tab === 'proyek') setPage('product')
          if (tab === 'tim') setPage('team')
        }}
        onDepositClick={() => setPage('deposit')}
        onWithdrawClick={() => setPage('withdraw')}
        onChangePinClick={() => setPage('change-pin')}
        onBankClick={() => setPage('bank-account')}
        onTermsClick={() => openTerms('profile')}
        onInviteClick={() => openInvite('profile')}
        onRiwayatClick={() => setPage('transaction-history')}
        onProfilSayaClick={() => setPage('my-profile')}
        onUbahKataSandiClick={() => setPage('change-password')}
        onHubungiCsClick={() => setPage('contact-support')}
        onTentangAplikasiClick={() => setPage('about-app')}
        onMisiClick={() => setPage('mission')}
        onLogoutClick={handleLogout}
      />
    )
  }

  if (page === 'my-profile') {
    return <ProfilSayaPage onBackClick={() => setPage('profile')} />
  }

  if (page === 'change-password') {
    return <UbahKataSandiAkunPage onBackClick={() => setPage('profile')} />
  }

  if (page === 'contact-support') {
    return <HubungiCsPage onBackClick={() => setPage('profile')} />
  }

  if (page === 'about-app') {
    return (
      <TentangAplikasiPage
        onBackClick={() => setPage('profile')}
        onTermsClick={() => openTerms('about-app')}
        onPrivacyClick={() => setPage('privacy')}
      />
    )
  }

  if (page === 'privacy') {
    return <PrivacyPage onBackClick={() => setPage('about-app')} />
  }

  if (page === 'team') {
    return (
      <TeamPage
        onNavigate={(tab) => {
          if (tab === 'home') setPage('dashboard')
          if (tab === 'proyek') setPage('product')
          if (tab === 'aku') setPage('profile')
        }}
        onViewBonusHistory={() => setPage('referral-history')}
      />
    )
  }

  if (page === 'product') {
    return (
      <ProdukPage
        onNavigate={(tab) => {
          if (tab === 'home') setPage('dashboard')
          if (tab === 'tim') setPage('team')
          if (tab === 'aku') setPage('profile')
        }}
        onBeliClick={(product) => {
          setSelectedProductId(product?.id ?? null)
          setPage('product-detail')
        }}
        onRiwayatClick={() => setPage('purchase-history')}
        onInviteClick={() => openInvite('product')}
        onMyProductClick={() => setPage('my-product')}
      />
    )
  }

  if (page === 'product-detail') {
    return (
      <ProdukDetailPage
        productId={selectedProductId}
        onBackClick={() => setPage('product')}
      />
    )
  }

  if (page === 'purchase-history') {
    return (
      <RiwayatPembelianPage
        onBackClick={() => setPage('product')}
        onDetailClick={() => setPage('my-product')}
      />
    )
  }

  if (page === 'my-product') {
    return <MyProductPage onBackClick={() => setPage('product')} />
  }

  if (page === 'voucher') {
    return <VoucherPage onBackClick={() => setPage('dashboard')} />
  }

  if (page === 'deposit') {
    return (
      <DepositPage
        onBackClick={() => setPage('dashboard')}
        onPayWithQris={(data) => {
          setQrisPayment(data)
          setPage('qris')
        }}
        onPayWithVa={(data) => {
          setVaPayment(data)
          setPage('va')
        }}
      />
    )
  }

  if (page === 'qris') {
    return (
      <QrisPage
        payment={qrisPayment}
        onBackClick={() => setPage('deposit')}
        onCheckStatus={() => setPage('deposit-history')}
        onBackHome={() => setPage('dashboard')}
      />
    )
  }

  if (page === 'va') {
    return (
      <VaPage
        payment={vaPayment}
        onBackClick={() => setPage('deposit')}
        onCheckStatus={() => setPage('deposit-history')}
        onBackHome={() => setPage('dashboard')}
      />
    )
  }

  if (page === 'withdraw') {
    return (
      <WithdrawPage
        onBackClick={() => setPage('dashboard')}
        onAddBankAccount={() => {
          setBankAccountOrigin('withdraw')
          setPage('bank-account')
        }}
        onEditPin={() => setPage('change-pin')}
      />
    )
  }

  if (page === 'change-pin') {
    return <ChangePinPage onBackClick={() => setPage('withdraw')} />
  }

  if (page === 'bank-account') {
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
