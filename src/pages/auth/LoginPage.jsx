import { useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import ErrorModal from '../../components/ErrorModal'
import bgImg from '../../assets/fb2ec6881c8e7cac3153b3a57d19c876a87ec705.png'
import headerImg from '../../assets/935654020de96c37559ad0d3b6522af067a28a6a.png'
import eyeIcon from '../../assets/3_106.svg'
import slideArrow from '../../assets/3_127.svg'

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

// Sesuai label "Nomor Telepon (+62)"
const normalizePhone = (value) => {
  const trimmed = value.trim()
  if (trimmed.startsWith('+')) return trimmed
  return `+62${trimmed.replace(/^0+/, '')}`
}

// Paksa format nomor Indonesia: hanya angka, selalu diawali 08 (terima paste +62/62)
const sanitizePhone = (value) => {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('62')) digits = digits.slice(2) // format +62/62
  digits = digits.replace(/^0+/, '') // buang kelebihan 0 di depan
  return digits ? (digits.startsWith('8') ? `0${digits}` : `08${digits}`) : ''
}

function LoginPage({
  onRegisterClick,
  onForgotPasswordClick,
  onLoginClick,
  sessionExpiredMessage,
}) {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Modal error khusus: kredensial salah (detail "Invalid phone number or password")
  const [modalMessage, setModalMessage] = useState('')

  // Slider verifikasi keamanan
  const trackRef = useRef(null)
  const dragStart = useRef(null)
  const [sliderPos, setSliderPos] = useState(0)
  const [isVerified, setIsVerified] = useState(false)
  const KNOB = 44
  const PAD = 3

  const maxSlide = () => {
    const track = trackRef.current
    if (!track) return 0
    return track.clientWidth - KNOB - PAD * 2
  }

  const handlePointerDown = (e) => {
    if (isVerified) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStart.current = e.clientX - sliderPos
  }

  const handlePointerMove = (e) => {
    if (dragStart.current === null) return
    const next = e.clientX - dragStart.current
    setSliderPos(Math.max(0, Math.min(maxSlide(), next)))
  }

  const handlePointerUp = () => {
    if (dragStart.current === null) return
    const max = maxSlide()
    if (sliderPos >= max - 4) {
      setSliderPos(max)
      setIsVerified(true)
    } else {
      setSliderPos(0)
    }
    dragStart.current = null
  }

  // Captcha lokal (frontend) — generate kode + gambar di canvas
  const CAPTCHA_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const captchaCanvasRef = useRef(null)
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')

  const generateCaptchaCode = () => {
    let code = ''
    for (let i = 0; i < 5; i++) {
      code += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)]
    }
    return code
  }

  const drawCaptcha = (code) => {
    const canvas = captchaCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height
    ctx.fillStyle = '#cfd3d8'
    ctx.fillRect(0, 0, w, h)
    // Garis noise
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 100)},${Math.floor(
        Math.random() * 100,
      )},${Math.floor(Math.random() * 100)},0.4)`
      ctx.beginPath()
      ctx.moveTo(Math.random() * w, Math.random() * h)
      ctx.lineTo(Math.random() * w, Math.random() * h)
      ctx.stroke()
    }
    // Titik noise
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = `rgba(${Math.floor(Math.random() * 150)},${Math.floor(
        Math.random() * 150,
      )},${Math.floor(Math.random() * 150)},0.5)`
      ctx.beginPath()
      ctx.arc(Math.random() * w, Math.random() * h, 1, 0, Math.PI * 2)
      ctx.fill()
    }
    // Karakter miring acak
    ctx.font = 'bold 20px Ubuntu, sans-serif'
    for (let i = 0; i < code.length; i++) {
      const x = 10 + (i * (w - 20)) / code.length
      const y = h / 2 + 7
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate((Math.random() - 0.5) * 0.5)
      ctx.fillStyle = `hsl(${Math.floor(Math.random() * 360)}, 55%, 32%)`
      ctx.fillText(code[i], 0, 0)
      ctx.restore()
    }
  }

  const refreshCaptcha = () => {
    const code = generateCaptchaCode()
    setCaptchaCode(code)
    drawCaptcha(code)
  }

  useEffect(() => {
    const code = generateCaptchaCode()
    setCaptchaCode(code)
    drawCaptcha(code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const phoneDigits = phone.replace(/\D/g, '').replace(/^0+/, '')
    if (!phoneDigits.startsWith('8')) {
      setError('Nomor telepon wajib diawali angka 08.')
      return
    }
    if (captchaInput.trim().toUpperCase() !== captchaCode) {
      setError('Kode captcha salah. Silakan coba lagi.')
      setCaptchaInput('')
      refreshCaptcha()
      return
    }
    if (!isVerified) {
      setError('Silakan geser slider verifikasi keamanan terlebih dahulu.')
      return
    }
    setLoading(true)
    const url = `${API_BASE}/api/auth/jwt/phone-login/`
    console.log('[Login] URL:', url)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(phone), password }),
      })
      let json
      try {
        json = await res.json()
      } catch (parseErr) {
        // Response bukan JSON (mis. HTML 404 dari Vite tanpa proxy)
        setError(`Terjadi kesalahan koneksi. Tolong segarkan halamannya.`)
        return
      }
      const data = parseResponse(json)
      if (!res.ok) {
        // Kredensial salah → keterangan jelas (modal), bukan "Kesalahan sistem"
        const rawErr = String(data?.detail || '')
        if (rawErr.toLowerCase().includes('password')) {
          const friendly = 'Nomor telepon atau kata sandi salah.'
          setError(friendly)
          setModalMessage(friendly)
          return
        }
        const msg = getErrorMessage(
          data,
          'Login gagal. Periksa kembali nomor telepon dan kata sandi Anda.',
        )
        setError(msg)
        return
      }
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      localStorage.setItem('user', JSON.stringify(data.user))
      onLoginClick?.()
    } catch (err) {
      setError('Terjadi kesalahan koneksi. Tolong segarkan halamannya.')
    } finally {
      setLoading(false)
    }
  }

  const inputBoxClass =
    'bg-[#f7f8fa] border border-[#e2e4e8] rounded-xl px-4 py-3.5 flex items-center focus-within:border-[#b0b4ba] transition-colors'
  const inputClass =
    'bg-transparent outline-none w-full text-sm text-[#1c1c1e] placeholder-[#b0b4ba]'

  return (
    <section
      id="section-login"
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat font-sans"
      style={{ backgroundImage: `url(${bgImg})` }}
    >
      {/* Main Card Container */}
      <div className="bg-white rounded-[18px] shadow-[0_6px_20px_rgba(0,0,0,0.08)] w-full max-w-[100%] overflow-hidden flex flex-col">
        {/* Header Image */}
        <img
          src={headerImg}
          alt="Header Background"
          className="w-full h-auto object-cover"
        />

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#e6e8eb] px-6 pt-5">
          {/* Active Tab: Login */}
          <div className="flex-1 flex flex-col items-center pb-3.5 relative cursor-pointer">
            <span className="text-[#1c1c1e] font-semibold text-sm">Login</span>
            <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#e0342c] rounded-sm"></div>
          </div>
          {/* Inactive Tab: Register */}
          <button
            type="button"
            onClick={onRegisterClick}
            className="flex-1 flex flex-col items-center pb-3.5 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="text-[#b0b4ba] font-semibold text-sm">
              Register
            </span>
          </button>
        </div>

        {/* Form Content Area */}
        <form className="p-6 flex flex-col gap-3" onSubmit={handleSubmit}>
          {/* Phone Number Input Group */}
          <div className="flex flex-col gap-2.5">
            <label className="text-sm text-[#1c1c1e] font-medium">
              Nomor Telepon (+62)
            </label>
            <div className={inputBoxClass}>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Masukkan Nomor Telepon"
                className={inputClass}
                value={phone}
                maxLength={15}
                onChange={(e) => setPhone(sanitizePhone(e.target.value))}
              />
            </div>
          </div>

          {/* Password Input Group */}
          <div className="flex flex-col gap-2.5 mt-1">
            <label className="text-sm text-[#1c1c1e] font-medium">
              Kata Sandi
            </label>
            <div className={`${inputBoxClass} justify-between`}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan Kata Sandi"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="focus:outline-none ml-2"
              >
                <img
                  src={eyeIcon}
                  alt="Toggle Password Visibility"
                  className="w-[18px] h-[18px] opacity-60 hover:opacity-100 transition-opacity"
                />
              </button>
            </div>
            {/* Forgot Password Link */}
            <div className="flex justify-end mt-1">
              <button
                type="button"
                onClick={onForgotPasswordClick}
                className="text-[13px] text-[#e0342c] hover:underline font-medium"
              >
                Lupa Kata Sandi?
              </button>
            </div>
          </div>

          {/* Captcha Input Group */}
          <div className="flex flex-col gap-2.5 mt-1">
            <label className="text-sm text-[#1c1c1e] font-medium">
              Captcha
            </label>
            <div className="flex gap-2.5">
              <div className={`${inputBoxClass} flex-1`}>
                <input
                  type="text"
                  placeholder="Masukkan Kode Captcha"
                  className={inputClass}
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                />
              </div>
              {/* Captcha Image */}
              <button
                type="button"
                onClick={refreshCaptcha}
                title="Klik untuk muat ulang"
                className="w-[100px] h-[46px] rounded-xl border border-[#b9bec5] flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity"
              >
                <canvas
                  ref={captchaCanvasRef}
                  width={100}
                  height={46}
                  className="w-full h-full block"
                />
              </button>
            </div>
          </div>

          {/* Security Verification Slider */}
          <div className="flex flex-col gap-2.5 mt-1">
            <label className="text-sm text-[#1c1c1e] font-medium">
              Verifikasi Keamanan
            </label>
            <div
              ref={trackRef}
              className={`bg-[#f7f8fa] border rounded-xl h-12 relative flex items-center justify-center overflow-hidden transition-colors ${
                isVerified ? 'border-[#2fb380]' : 'border-[#e2e4e8]'
              }`}
            >
              <span
                className={`text-sm ${
                  isVerified ? 'text-[#2fb380] font-medium' : 'text-[#9aa0a6]'
                }`}
              >
                {isVerified ? 'Verifikasi berhasil' : 'Geser untuk verifikasi'}
              </span>
              {/* Draggable Slider Button */}
              <div
                className={`absolute top-[2px] w-[44px] h-[44px] rounded-[10px] flex items-center justify-center select-none touch-none cursor-grab active:cursor-grabbing transition-colors ${
                  isVerified
                    ? 'bg-[#2fb380] shadow-[0_2px_6px_rgba(47,179,128,0.4)]'
                    : 'bg-[#e0342c] shadow-[0_2px_6px_rgba(224,52,44,0.4)]'
                }`}
                style={{ left: `${PAD + sliderPos}px` }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {isVerified ? (
                  <svg
                    className="w-[18px] h-[18px] text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <img
                    src={slideArrow}
                    alt="Slide Arrow"
                    className="w-[18px] h-[18px]"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Privacy Disclaimer */}
          <div className="pt-2 pb-1">
            <p className="text-[11px] leading-[1.4] text-[#9aa0a6]">
              <span className="block mb-1">Keamanan & Privasi</span>
              Data yang Anda masukkan hanya digunakan untuk proses pendaftaran,
              verifikasi akun, dan keamanan layanan. Jangan pernah membagikan
              kata sandi atau kode verifikasi kepada siapa pun.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-[13px] text-[#d6392c] font-medium">{error}</p>
          )}

          {/* Pesan sesi berakhir (auto logout karena token kedaluwarsa) */}
          {sessionExpiredMessage && (
            <p className="text-[13px] text-[#d6392c] font-medium">
              {sessionExpiredMessage}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="bg-[#0d1b4c] text-white rounded-[14px] p-4 w-full font-semibold text-sm mt-1 hover:bg-[#152663] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0d1b4c] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>

      {/* Modal error kredensial salah */}
      <ErrorModal
        open={Boolean(modalMessage)}
        title="Login Gagal"
        message={modalMessage}
        onClose={() => setModalMessage('')}
      />
    </section>
  )
}

export default LoginPage
