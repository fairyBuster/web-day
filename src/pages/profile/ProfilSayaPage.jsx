import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import avatarImg from '../../assets/6599a1a542c3a2fd08343a2ebac01e9ee2c2e144.png'
import backIcon from '../../assets/28_238.svg'
import verifiedIcon from '../../assets/28_266.svg'
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

// "085100000000" → "+6285xxx0000"
const maskPhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return '-'
  if (digits.length < 5) return `+62 ${digits}`
  const intl = digits.startsWith('0') ? `62${digits.slice(1)}` : digits
  return `+${intl.slice(0, 4)}xxx${intl.slice(-4)}`
}

// rank API → label level seragam ("Rank 0" untuk yang belum punya rank)
const rankLabel = (rank) => `Rank ${Number(rank) || 0}`

// Format tanggal API → "12 Juli 2026"
const formatShortDate = (dateStr) => {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr || '-'
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function ProfilSayaPage({ onBackClick }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadProfile = async () => {
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
        // Response bukan JSON (mis. HTML 404 dari Vite tanpa proxy)
        setError(
          `Terjadi kesalahan koneksi. Tolong segarkan halamannya.`,
        )
        return
      }
      const data = parseResponse(json)
      if (!res.ok) {
        setError(getErrorMessage(data, 'Gagal memuat profil.'))
        return
      }
      setProfile(data)
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Avatar dari backend berupa URL absolut (http/https) atau path relatif.
  // Kalau gagal dimuat (mis. file avatar hilang/404), jatuh ke gambar default.
  const [avatarFailed, setAvatarFailed] = useState(false)
  const avatarSrc = avatarFailed
    ? avatarImg
    : profile?.avatar
      ? /^https?:\/\//i.test(profile.avatar)
        ? profile.avatar
        : `${API_BASE}${profile.avatar}`
      : avatarImg

  const personalData = [
    // ID Member = kode referral user (bukan username)
    {
      label: 'ID Member',
      value: profile?.referral_code || '-',
      verified: false,
    },
    { label: 'Nomor Telepon', value: maskPhone(profile?.phone), verified: true },
  ]

  const accountInfo = [
    { label: 'Level Keanggotaan', value: profile?.rank_title || rankLabel(profile?.rank) },
    { label: 'Bergabung Sejak', value: formatShortDate(profile?.created_at) },
  ]

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header Section */}
      <section className="w-full flex justify-center bg-[#0d1b4c] pb-[34px]">
        <div className="w-full max-w-md">
          {/* Top Navigation Bar */}
          <div className="flex items-center px-4 h-[56px]">
            <button
              type="button"
              onClick={onBackClick}
              className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity"
              aria-label="Go back"
            >
              <img src={backIcon} alt="Back" className="w-[18px] h-[18px]" />
            </button>
            <h1 className="flex-1 text-center text-white font-semibold text-[16px]">
              Profil
            </h1>
            <div className="w-6 h-6"></div>
          </div>

          {/* Profile Information */}
          <div className="flex flex-col items-center mt-3">
            <div className="w-[76px] h-[76px] rounded-full overflow-hidden mb-3">
              <img
                src={avatarSrc}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={() => setAvatarFailed(true)}
              />
            </div>
            <h2 className="text-white font-semibold text-[16px] mb-1">
              {maskPhone(profile?.phone)}
            </h2>
            <div className="bg-[#ffd88a] px-[10px] py-[3px] rounded-full flex items-center justify-center">
              <span className="text-[#0d1b4c] text-[11px] font-bold">
                {profile?.rank_title || rankLabel(profile?.rank)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="w-full flex justify-center bg-[#eceef1] min-h-screen px-4 pb-8">
        <div className="w-full max-w-md">
          <div className="-mt-[19px] relative z-10">
            {loading ? (
              <p className="text-textLight text-sm text-center py-8">
                Memuat profil...
              </p>
            ) : (
              <>
                {/* Card 1: Data Diri */}
                <div className="bg-white rounded-[16px] px-5 py-[6px] mb-2 shadow-[0_6px_20px_rgba(13,27,76,0.08)]">
                  <div className="pt-[16px] pb-[4px]">
                    <h3 className="text-textLight text-[12px] font-semibold uppercase tracking-wide">
                      Data Diri
                    </h3>
                  </div>
                  {personalData.map((row) => (
                    <div
                      key={row.label}
                      className="flex justify-between items-center py-[15px] border-b border-borderGray last:border-b-0"
                    >
                      <span className="text-textLight text-[13px]">{row.label}</span>
                      {row.verified ? (
                        <div className="flex items-center gap-1">
                          <img src={verifiedIcon} alt="Verified" className="w-3 h-3" />
                          <span className="text-[#2fb380] text-[13px] font-medium">
                            {row.value}
                          </span>
                        </div>
                      ) : (
                        <span className="text-textDark text-[13px] font-medium">
                          {row.value}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Card 2: Informasi Akun */}
                <div className="bg-white rounded-[16px] px-5 py-[6px] shadow-[0_4px_16px_rgba(13,27,76,0.05)]">
                  <div className="pt-[16px] pb-[4px]">
                    <h3 className="text-textLight text-[12px] font-semibold uppercase tracking-wide">
                      Informasi Akun
                    </h3>
                  </div>
                  {accountInfo.map((row) => (
                    <div
                      key={row.label}
                      className="flex justify-between items-center py-[15px] border-b border-borderGray last:border-b-0"
                    >
                      <span className="text-textLight text-[13px]">{row.label}</span>
                      <span className="text-textDark text-[13px] font-medium">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <ErrorModal
        open={Boolean(error)}
        title="Gagal Memuat Profil"
        message={error}
        onClose={() => setError('')}
      />
    </div>
  )
}

export default ProfilSayaPage
