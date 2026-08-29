import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import backIcon from '../../assets/28_526.svg'
import csIcon from '../../assets/28_533.svg'
import waIcon from '../../assets/28_545.svg'
import waArrowIcon from '../../assets/28_552.svg'
import tgIcon from '../../assets/28_567.svg'
import tgArrowIcon from '../../assets/28_575.svg'
import emailIcon from '../../assets/28_579.svg'
import emailArrowIcon from '../../assets/28_587.svg'
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

// Ikon & warna per platform API
const platformStyle = {
  whatsapp: { icon: waIcon, arrow: waArrowIcon, bg: 'bg-[#e0f3e1]' },
  telegram: { icon: tgIcon, arrow: tgArrowIcon, bg: 'bg-[#dbe9fb]' },
  email: { icon: emailIcon, arrow: emailArrowIcon, bg: 'bg-[#fbeed4]' },
}

function HubungiCsPage({ onBackClick }) {
  const [contacts, setContacts] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const loadLinks = async (pageNum, append = false) => {
    if (!append) setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/support/links/?page=${pageNum}`, {
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
        setError(getErrorMessage(data, 'Gagal memuat kontak.'))
        return
      }
      const results = Array.isArray(data.results) ? data.results : []
      setContacts((prev) => (append ? [...prev, ...results] : results))
      setHasMore(Boolean(data.next))
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadLinks(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLoadMore = () => {
    if (loadingMore) return
    const nextPage = page + 1
    setPage(nextPage)
    setLoadingMore(true)
    loadLinks(nextPage, true)
  }

  return (
    <div className="min-h-screen bg-[#eceef1] font-sans">
      {/* Header Section */}
      <section className="bg-primary sticky top-0 z-20">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-center relative">
          <button
            type="button"
            onClick={onBackClick}
            className="absolute left-4 p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Go back"
          >
            <img src={backIcon} alt="" className="w-[18px] h-[18px]" />
          </button>
          <h1 className="text-white font-semibold text-[16px]">Hubungi CS</h1>
        </div>
      </section>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary to-[#14245c] flex justify-center">
        <div className="max-w-md mx-auto px-5 pt-8 pb-28 flex flex-col items-center text-center">
          <div className="w-[58px] h-[58px] bg-white/15 rounded-full flex items-center justify-center mb-4">
            <img src={csIcon} alt="" className="w-[26px] h-[26px]" />
          </div>
          <h2 className="text-white font-bold text-[18px] mb-2">Butuh Bantuan?</h2>
          <p className="text-[#b7c0dd] text-[14px] leading-relaxed mb-6 max-w-[300px]">
            Tim kami siap membantu kendala akun, transaksi, atau pertanyaan lainnya.
          </p>
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-[14px] py-[6px]">
            <div className="w-[7px] h-[7px] rounded-[3.5px] bg-[#2fb380]"></div>
            <span className="text-white text-[12px] font-medium">Online · 08.00 - 22.00 WIB</span>
          </div>
        </div>
      </section>

      {/* Contact Options Section */}
      <section className="relative z-10 pb-12">
        <div className="max-w-md mx-auto px-4 -mt-16">
          <div className="bg-white rounded-[16px] shadow-[0_6px_20px_rgba(13,27,76,0.08)] px-5 py-1.5 flex flex-col">
            {loading ? (
              <p className="text-textLight text-sm text-center py-8">
                Memuat kontak...
              </p>
            ) : contacts.length === 0 ? (
              <p className="text-textLight text-sm text-center py-8">
                Belum ada kontak.
              </p>
            ) : (
              contacts.map((contact) => {
                const platform = String(contact.platform || '').toLowerCase()
                const style = platformStyle[platform] || {
                  icon: waIcon,
                  arrow: waArrowIcon,
                  bg: 'bg-[#f2f3f5]',
                }
                return (
                  <a
                    key={contact.id}
                    href={contact.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-[14px] py-[15px] border-b border-borderGray last:border-b-0 group hover:opacity-80 transition-opacity"
                  >
                    <div
                      className={`w-[42px] h-[42px] rounded-[12px] ${style.bg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
                    >
                      <img src={style.icon} alt={contact.title} className="w-[20px] h-[20px]" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <h3 className="text-textDark font-medium text-[15px] leading-tight">
                        {contact.title}
                      </h3>
                      <p className="text-textLight text-[13px] mt-[2px] leading-tight">
                        {contact.description}
                      </p>
                    </div>
                    <img
                      src={style.arrow}
                      alt=""
                      className="w-[18px] h-[18px] opacity-40 group-hover:opacity-100 transition-all group-hover:translate-x-1"
                    />
                  </a>
                )
              })
            )}
          </div>

          {hasMore && !loading && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="mt-4 w-full py-3 rounded-2xl border border-borderGray bg-white text-accent text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {loadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
            </button>
          )}
        </div>
      </section>

      <ErrorModal
        open={Boolean(error)}
        title="Gagal Memuat Kontak"
        message={error}
        onClose={() => setError('')}
      />
    </div>
  )
}

export default HubungiCsPage
