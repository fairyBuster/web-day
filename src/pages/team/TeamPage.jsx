import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import rumahIcon from '../../assets/22_2602.svg'
import proyekIcon from '../../assets/22_2608.svg'
import timIcon from '../../assets/22_2614.svg'
import akuIcon from '../../assets/22_2622.svg'
import memberIcon from '../../assets/21_1218.svg'
import BottomNav from '../../components/BottomNav'
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

// Format angka ke format Indonesia dengan prefix Rp (contoh: Rp23.923,33)
const formatPrice = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return `Rp${String(value)}`
  return `Rp${num.toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

// Jumlah anggota downline per halaman
const PAGE_SIZE = 10

const navIcons = {
  home: rumahIcon,
  proyek: proyekIcon,
  tim: timIcon,
  aku: akuIcon,
}

function TeamPage({ onNavigate, onViewBonusHistory }) {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState('Semua')
  const [currentPage, setCurrentPage] = useState(1)

  const loadOverview = async () => {
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
        // Response bukan JSON (mis. HTML 404 dari Vite tanpa proxy)
        setError(
          `Terjadi kesalahan koneksi. Tolong segarkan halamannya.`,
        )
        return
      }
      const data = parseResponse(json)
      if (!res.ok) {
        setError(getErrorMessage(data, 'Gagal memuat data tim.'))
        return
      }
      setOverview(data)
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOverview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Halaman hanya menampilkan 3 level (sesuai desain)
  const levels = (Array.isArray(overview?.levels) ? overview.levels : []).slice(
    0,
    3,
  )
  const totalMembers = Number(overview?.total_members) || 0
  const activeMembers = levels.reduce(
    (sum, lvl) => sum + (Number(lvl.active_member_count) || 0),
    0,
  )
  const inactiveMembers = Math.max(0, totalMembers - activeMembers)

  // Statistik anggota mengikuti filter kategori yang dipilih (Semua / Level N)
  const selectedLevel = levels.find(
    (lvl) => `Level ${lvl.level}` === activeFilter,
  )
  const statsTotal = selectedLevel
    ? Number(selectedLevel.member_count) || 0
    : totalMembers
  const statsActive = selectedLevel
    ? Number(selectedLevel.active_member_count) || 0
    : activeMembers
  const statsInactive = Math.max(0, statsTotal - statsActive)

  // Total Komisi Tim = komisi profit + komisi pembelian yang dihasilkan jaringan
  const totalCommission =
    (Number(overview?.total_profit_commission) || 0) +
    (Number(overview?.total_purchase_commission) || 0)

  const statCards = [
    {
      label: 'Total Tim',
      total: totalMembers,
      aktif: `${activeMembers} Aktif`,
      belum: `${inactiveMembers} Belum`,
    },
    ...levels.map((lvl) => ({
      label: `Level ${lvl.level}`,
      total: Number(lvl.member_count) || 0,
      aktif: `${Number(lvl.active_member_count) || 0} Aktif`,
      belum: `${
        (Number(lvl.member_count) || 0) - (Number(lvl.active_member_count) || 0)
      } Belum`,
    })),
  ]

  const filters = ['Semua', ...levels.map((lvl) => `Level ${lvl.level}`)]

  // Anggota terbaru (tanggal daftar) tampil paling atas
  const allMembers = levels
    .flatMap((lvl) =>
      (lvl.members || []).map((m) => ({ ...m, level: lvl.level })),
    )
    .sort(
      (a, b) => new Date(b.registration_date) - new Date(a.registration_date),
    )
  const filteredMembers =
    activeFilter === 'Semua'
      ? allMembers
      : allMembers.filter(
          (m) => m.level === Number(activeFilter.replace('Level ', '')),
        )

  // Paginasi daftar downline (client-side, data sudah dimuat semua)
  const pageCount = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, pageCount)
  const pagedMembers = filteredMembers.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  return (
    <div className="min-h-screen bg-background font-sans pb-24">
      {/* Header Section */}
      <section className="max-w-md mx-auto bg-primary pt-5 pb-14 px-4 relative">
        <h1 className="text-white text-center font-semibold text-lg mb-6">
          Tim Saya
        </h1>

        {/* Stat Cards Container */}
        <div className="flex gap-3 overflow-x-auto snap-x">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="bg-white/10 rounded-xl p-3 min-w-[85px] flex flex-col items-center snap-start"
            >
              <span className="text-[#b7c0dd] text-xs mb-1">{card.label}</span>
              <span className="text-white text-xl font-bold mb-2">
                {card.total}
              </span>
              <div className="flex flex-col items-center leading-tight">
                <span className="text-[#6fe0a0] text-[10px]">{card.aktif}</span>
                <span className="text-[#8892b8] text-[10px]">{card.belum}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Overview Section */}
      <section className="max-w-md mx-auto bg-background px-4 relative">
        {/* Commission Card */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex justify-between items-center -mt-6 relative z-10">
          <div className="flex flex-col gap-1">
            <span className="text-textLight text-xs">Total Komisi Tim</span>
            <span className="text-primary text-xl font-bold">
              {formatPrice(totalCommission)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onViewBonusHistory?.()}
            className="text-[#d6392c] text-xs font-medium hover:underline"
          >
            Lihat Riwayat
          </button>
        </div>

        {/* Member Stats Card */}
        <div className="bg-white rounded-2xl py-4 mt-4 flex justify-between items-center shadow-sm">
          <div className="flex-1 flex flex-col items-center border-r border-background">
            <span className="text-textLight text-[11px] mb-1">Total Anggota</span>
            <span className="text-primary text-lg font-bold">
              {statsTotal}
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center border-r border-background">
            <span className="text-textLight text-[11px] mb-1">Aktif</span>
            <span className="text-[#2fb380] text-lg font-bold">
              {statsActive}
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <span className="text-textLight text-[11px] mb-1">
              Belum Investasi
            </span>
            <span className="text-[#b0b4ba] text-lg font-bold">
              {statsInactive}
            </span>
          </div>
        </div>
      </section>

      {/* Members Section */}
      <section className="max-w-md mx-auto bg-background px-4 pt-6 pb-10">
        {/* Filter Pills — tetap tampil walau belum ada downline */}
        <div className="flex gap-2 overflow-x-auto mb-4">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => {
                setActiveFilter(filter)
                setCurrentPage(1)
              }}
              className={`px-5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === filter
                  ? 'bg-primary text-white'
                  : 'bg-white text-textGray'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Member List Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-4">
          {loading ? (
            <p className="text-textLight text-sm text-center py-6">
              Memuat anggota tim...
            </p>
          ) : filteredMembers.length === 0 ? (
            <p className="text-textLight text-sm text-center py-6">
              Belum ada anggota downline.
            </p>
          ) : (
            pagedMembers.map((member, index) => {
              const isInvesting = Number(member.total_investments) > 0
              return (
                <div
                  key={`${member.level}-${member.username}-${index}`}
                  className="flex items-center justify-between border-b border-borderGray pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-imageBg border border-imageBorder flex items-center justify-center flex-shrink-0">
                      <img src={memberIcon} alt="Anggota" className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-textDark text-sm font-semibold truncate">
                          {member.referral_code}
                        </span>
                        <span className="bg-[#dbe9fb] text-primary text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0">
                          L{member.level}
                        </span>
                      </div>
                      <span className="text-textLight text-xs mt-0.5">
                        {member.phone}
                      </span>
                      <span className="text-primary text-[11px] font-medium mt-0.5">
                        {member.rank_title || `Rank ${member.rank || 0}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-textDark text-sm font-semibold">
                      {formatPrice(member.total_investment_amount)}
                    </span>
                    <span
                      className={`text-[10px] mt-0.5 ${
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

          {/* Pagination Controls — tetap tampil walau belum ada downline */}
          {!loading && (
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="border border-primary text-primary text-xs font-medium px-4 py-2 rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                Sebelumnya
              </button>
              <span className="text-textLight text-xs">
                Halaman {safePage} dari {pageCount}
              </span>
              <button
                type="button"
                disabled={safePage >= pageCount}
                onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                className="border border-primary text-primary text-xs font-medium px-4 py-2 rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                Berikutnya
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Bottom Navigation */}
      <BottomNav active="tim" onNavigate={onNavigate} icons={navIcons} />

      {/* Error Modal */}
      <ErrorModal
        open={Boolean(error)}
        title="Gagal Memuat Data Tim"
        message={error}
        onClose={() => setError('')}
      />
    </div>
  )
}

export default TeamPage
