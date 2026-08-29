import { useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import bgImg from '../../assets/fb2ec6881c8e7cac3153b3a57d19c876a87ec705.png'
import headerImg from '../../assets/935654020de96c37559ad0d3b6522af067a28a6a.png'
import eyeIcon from '../../assets/3_32.svg'
import eyeIcon2 from '../../assets/3_42.svg'
import slideArrow from '../../assets/3_67.svg'
import SuccessModal from '../../components/SuccessModal'
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

// Username acak (tidak ditampilkan ke user, hanya untuk memenuhi API)
const generateUsername = () => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-'
  let result = ''
  for (let i = 0; i < 40; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

// Email acak (tidak ditampilkan ke user, hanya untuk memenuhi API)
const generateEmail = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let name = ''
  for (let i = 0; i < 12; i++) {
    name += chars[Math.floor(Math.random() * chars.length)]
  }
  return `${name}@example.com`
}

function RegisterPage({ onLoginClick, onTermsClick, initialReferralCode }) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agree, setAgree] = useState(false)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  // Kode referral: bisa datang dari link undangan (#/invite/{kode}) lewat prop
  const [referralCode, setReferralCode] = useState(initialReferralCode || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

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
    if (!agree) {
      setError('Anda harus menyetujui Syarat & Ketentuan terlebih dahulu.')
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
    if (password !== password2) {
      setError('Konfirmasi kata sandi tidak sama dengan kata sandi.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: generateUsername(),
          email: generateEmail(),
          phone: normalizePhone(phone),
          password,
          password2,
          referral_code: referralCode.trim() || undefined,
        }),
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
        setError(
          getErrorMessage(data, 'Pendaftaran gagal. Silakan coba lagi.'),
        )
        return
      }
      setShowSuccess(true)
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
    } finally {
      setLoading(false)
    }
  }

  const inputBoxClass =
    'bg-[#f7f8fa] border border-[#e2e4e8] rounded-xl px-4 py-[14px] focus-within:border-blue-400 transition-colors'
  const inputClass =
    'w-full bg-transparent outline-none text-[#1c1c1e] placeholder-[#b0b4ba] text-sm'

  return (
    <section
      id="section-register"
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat py-8 px-4"
      style={{ backgroundImage: `url(${bgImg})` }}
    >
      {/* Main Card Container */}
      <div className="w-full max-w-[412px] bg-white rounded-xl overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,0.08)]">
        {/* Header Image Area */}
        <div className="w-full h-[228px]">
          <img
            src={headerImg}
            alt="Header Background"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#e6e8eb]">
          <button
            type="button"
            onClick={onLoginClick}
            className="flex-1 py-5 text-center text-[#b0b4ba] font-medium hover:text-gray-600 transition-colors"
          >
            Login
          </button>
          <button
            type="button"
            className="flex-1 py-5 text-center text-[#1c1c1e] font-medium border-b-[3px] border-[#e0342c]"
          >
            Register
          </button>
        </div>

        {/* Form Content Area */}
        <div className="p-6 flex flex-col gap-[14px]">
          {/* Phone Number Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#1c1c1e]">
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

          {/* Password Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#1c1c1e]">
              Kata Sandi
            </label>
            <div className={`${inputBoxClass} flex justify-between items-center`}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Masukkan Kata Sandi"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <img
                src={eyeIcon}
                alt="Toggle Password Visibility"
                onClick={() => setShowPassword((v) => !v)}
                className="w-[18px] h-[18px] cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
              />
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#1c1c1e]">
              Konfirmasi Kata Sandi
            </label>
            <div className={`${inputBoxClass} flex justify-between items-center`}>
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Konfirmasi Kata Sandi"
                className={inputClass}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
              />
              <img
                src={eyeIcon2}
                alt="Toggle Password Visibility"
                onClick={() => setShowConfirm((v) => !v)}
                className="w-[18px] h-[18px] cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
              />
            </div>
          </div>

          {/* Referral Code Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#1c1c1e]">
              Kode Referral
            </label>
            <div className={inputBoxClass}>
              <input
                type="text"
                placeholder="Masukkan Kode (Optional)"
                className={inputClass}
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
              />
            </div>
          </div>

          {/* Captcha Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#1c1c1e]">Captcha</label>
            <div className="flex gap-[10px]">
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
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#1c1c1e]">
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

          {/* Terms and Conditions Checkbox */}
          <div className="flex items-start gap-[10px] pt-1.5">
            <div
              onClick={() => setAgree((v) => !v)}
              className={`w-5 h-5 bg-white border rounded-md flex-shrink-0 mt-0.5 cursor-pointer flex items-center justify-center transition-colors ${
                agree
                  ? 'border-[#2fb380]'
                  : 'border-[#d3d6db] hover:border-gray-400'
              }`}
            >
              {agree && (
                <svg
                  className="w-[14px] h-[14px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2fb380"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <p
              className="text-sm text-[#1c1c1e] leading-snug cursor-pointer select-none"
              onClick={() => setAgree((v) => !v)}
            >
              Saya setuju dengan{' '}
              <span
                role="link"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  onTermsClick()
                }}
                className="text-[#e0342c] hover:underline"
              >
                Syarat & Ketentuan
              </span>{' '}
              yang berlaku
            </p>
          </div>

          {/* Privacy Disclaimer */}
          <div className="pt-2">
            <p className="text-[11px] text-[#9aa0a6] leading-relaxed">
              <span className="font-medium text-gray-500">
                Keamanan & Privasi
              </span>
              <br />
              Data yang Anda masukkan hanya digunakan untuk proses pendaftaran,
              verifikasi akun, dan keamanan layanan. Jangan pernah membagikan
              kata sandi atau kode verifikasi kepada siapa pun.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[#0d1b4c] text-white font-medium py-4 rounded-[14px] mt-2 hover:bg-[#0a153d] active:scale-[0.99] transition-all shadow-sm disabled:opacity-60"
          >
            {loading ? 'Mendaftarkan...' : 'Daftar'}
          </button>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        open={showSuccess}
        title="Pendaftaran berhasil"
        message={`Selamat datang ${normalizePhone(phone) || '+62XXXXXXXXXX'}`}
        onClose={() => {
          setShowSuccess(false)
          onLoginClick()
        }}
      />

      {/* Error Modal */}
      <ErrorModal
        open={Boolean(error)}
        title="Pendaftaran gagal"
        message={error}
        onClose={() => setError('')}
      />
    </section>
  )
}

export default RegisterPage
