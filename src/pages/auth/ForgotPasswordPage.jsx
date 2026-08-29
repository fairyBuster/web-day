import { useEffect, useRef, useState } from 'react'
import bgImg from '../../assets/fb2ec6881c8e7cac3153b3a57d19c876a87ec705.png'
import headerImg from '../../assets/935654020de96c37559ad0d3b6522af067a28a6a.png'
import eyeIcon from '../../assets/3_167.svg'
import eyeIcon2 from '../../assets/3_177.svg'
import swipeIcon from '../../assets/3_196.svg'
import backIcon from '../../assets/28_238.svg'
import SuccessModal from '../../components/SuccessModal'
import ErrorModal from '../../components/ErrorModal'

// Halaman ini sengaja non-fungsional (pajangan): tidak ada panggilan API,
// semua tombol hanya simulasi timer. User harus hubungi admin untuk reset.

function ForgotPasswordPage({ onBackClick }) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agree, setAgree] = useState(false)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [resendSeconds, setResendSeconds] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isResetDone, setIsResetDone] = useState(false)

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

  // Kirim kode OTP — hanya simulasi timer, tidak benar-benar mengirim kode apa pun
  const handleSendOtp = () => {
    setError('')
    if (!phone.trim()) {
      setError('Nomor telepon wajib diisi terlebih dahulu.')
      return
    }
    setResendSeconds(60)
    setIsResetDone(false)
    setSuccess('Kode verifikasi berhasil dikirim')
  }

  // Hitung mundur tombol "Kirim Ulang" (60 detik)
  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = setTimeout(() => {
      setResendSeconds((s) => s - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [resendSeconds])

  // Simpan kata sandi baru — fitur nonaktif (pajangan): kode verifikasi
  // tidak pernah valid, sehingga reset kata sandi tidak akan pernah berhasil
  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
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
    if (password !== passwordConfirm) {
      setError('Konfirmasi kata sandi tidak sama dengan kata sandi baru.')
      return
    }
    setError(
      'Kode verifikasi salah atau kedaluwarsa. Silakan hubungi admin untuk bantuan.',
    )
  }

  const inputClass =
    'bg-[#f7f8fa] border border-[#e2e4e8] rounded-[12px] px-[16px] py-[14px] text-[14px] w-full outline-none focus:border-[#0d1b4c] placeholder-[#b0b4ba] text-[#1c1c1e] transition-colors'

  return (
    <section
      id="section-main"
      className="relative min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans"
    >
      {/* Fullscreen Background Image */}
      <img
        src={bgImg}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover -z-10"
      />

      {/* Main Form Card */}
      <div className="bg-white rounded-[18px] shadow-[0_6px_20px_rgba(0,0,0,0.08)] w-full max-w-[412px] overflow-hidden flex flex-col z-10">
        {/* Header Image */}
        <div className="w-full h-[235px] relative shrink-0">
          <img
            src={headerImg}
            alt="Header Background"
            className="w-full h-full object-cover"
          />
          {/* Back Button */}
          <button
            type="button"
            onClick={onBackClick}
            aria-label="Go back"
            className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center bg-black/25 rounded-full hover:bg-black/40 transition-colors"
          >
            <img src={backIcon} alt="Back" className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* Content Container */}
        <div className="p-[24px] flex flex-col gap-[24px]">
          {/* Title & Subtitle */}
          <div className="flex flex-col gap-[7px]">
            <h1 className="text-[20px] font-bold text-[#1c1c1e]">
              Lupa Kata Sandi
            </h1>
            <p className="text-[14px] text-[#9aa0a6] leading-snug">
              Masukkan nomor telepon terdaftar untuk menerima kode verifikasi,
              lalu buat kata sandi baru.
            </p>
          </div>

          {/* Form Fields Container */}
          <div className="flex flex-col gap-[14px]">
            {/* Phone Number Input */}
            <div className="flex flex-col gap-[10px]">
              <label className="text-[14px] font-medium text-[#1c1c1e]">
                Nomor Telepon (+62)
              </label>
              <input
                type="tel"
                placeholder="Masukkan Nomor Telepon"
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* Verification Code Input */}
            <div className="flex flex-col gap-[10px]">
              <label className="text-[14px] font-medium text-[#1c1c1e]">
                Kode Verifikasi
              </label>
              <div className="flex gap-[10px]">
                <input
                  type="text"
                  placeholder="Masukkan Kode Verifikasi"
                  className={`${inputClass} flex-1`}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={resendSeconds > 0}
                  className="bg-white border border-[#e0342c] text-[#e0342c] rounded-[12px] px-[16px] py-[14px] text-[14px] font-medium whitespace-nowrap hover:bg-red-50 transition-colors shrink-0 disabled:opacity-60"
                >
                  {resendSeconds > 0
                    ? `Kirim Ulang (${resendSeconds}s)`
                    : 'Kirim Kode'}
                </button>
              </div>
            </div>

            {/* New Password Input */}
            <div className="flex flex-col gap-[10px]">
              <label className="text-[14px] font-medium text-[#1c1c1e]">
                Kata Sandi Baru
              </label>
              <div className="relative w-full">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan Kata Sandi Baru"
                  className={`${inputClass} pl-[16px] pr-[40px]`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-[16px] top-1/2 -translate-y-1/2 flex items-center justify-center hover:opacity-70 transition-opacity"
                >
                  <img
                    src={eyeIcon}
                    alt="Toggle Password Visibility"
                    className="w-[18px] h-[18px]"
                  />
                </button>
              </div>
            </div>

            {/* Confirm New Password Input */}
            <div className="flex flex-col gap-[10px]">
              <label className="text-[14px] font-medium text-[#1c1c1e]">
                Konfirmasi Kata Sandi Baru
              </label>
              <div className="relative w-full">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Konfirmasi Kata Sandi Baru"
                  className={`${inputClass} pl-[16px] pr-[40px]`}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-[16px] top-1/2 -translate-y-1/2 flex items-center justify-center hover:opacity-70 transition-opacity"
                >
                  <img
                    src={eyeIcon2}
                    alt="Toggle Password Visibility"
                    className="w-[18px] h-[18px]"
                  />
                </button>
              </div>
            </div>

            {/* Captcha Input */}
            <div className="flex flex-col gap-[10px]">
              <label className="text-[14px] font-medium text-[#1c1c1e]">
                Captcha
              </label>
              <div className="flex gap-[10px]">
                <input
                  type="text"
                  placeholder="Masukkan Kode Captcha"
                  className={`${inputClass} flex-1`}
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  title="Klik untuk muat ulang"
                  className="w-[100px] h-[48px] rounded-[12px] border border-[#b9bec5] overflow-hidden shrink-0 hover:opacity-80 transition-opacity"
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

            {/* Security Verification Swipe */}
            <div className="flex flex-col gap-[10px]">
              <label className="text-[14px] font-medium text-[#1c1c1e]">
                Verifikasi Keamanan
              </label>
              <div
                ref={trackRef}
                className={`bg-[#f7f8fa] border rounded-[12px] p-[3px] flex items-center relative h-[48px] overflow-hidden transition-colors ${
                  isVerified ? 'border-[#2fb380]' : 'border-[#e2e4e8]'
                }`}
              >
                <div
                  className={`absolute w-full text-center text-[14px] pointer-events-none ${
                    isVerified ? 'text-[#2fb380] font-medium' : 'text-[#9aa0a6]'
                  }`}
                >
                  {isVerified ? 'Verifikasi berhasil' : 'Geser untuk verifikasi'}
                </div>
                <button
                  type="button"
                  className={`absolute top-[3px] w-[44px] h-[44px] rounded-[10px] flex items-center justify-center shadow-[0_2px_6px_rgba(224,52,44,0.4)] z-10 cursor-grab active:cursor-grabbing touch-none select-none transition-colors ${
                    isVerified
                      ? 'bg-[#2fb380] shadow-[0_2px_6px_rgba(47,179,128,0.4)]'
                      : 'bg-[#e0342c] hover:bg-red-700'
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
                      src={swipeIcon}
                      alt="Swipe Icon"
                      className="w-[18px] h-[18px]"
                    />
                  )}
                </button>
              </div>
            </div>

            {/* Terms & Conditions Checkbox */}
            <label
              className="flex items-start gap-[10px] mt-[6px] cursor-pointer group"
              onClick={() => setAgree((v) => !v)}
            >
              <div className="relative flex items-center justify-center mt-[2px] shrink-0">
                <input
                  type="checkbox"
                  checked={agree}
                  readOnly
                  className={`appearance-none w-[20px] h-[20px] border rounded-[6px] bg-white transition-colors cursor-pointer ${
                    agree
                      ? 'bg-[#0d1b4c] border-[#0d1b4c]'
                      : 'border-[#d3d6db]'
                  }`}
                />
                <svg
                  className={`absolute w-[12px] h-[12px] pointer-events-none ${
                    agree ? 'opacity-100' : 'opacity-0'
                  }`}
                  viewBox="0 0 14 10"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 5L4.5 8.5L13 1"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="text-[14px] text-[#1c1c1e] leading-snug">
                Saya setuju dengan Syarat & Ketentuan yang berlaku
              </span>
            </label>

            {/* Privacy Notice Text */}
            <p className="text-[12px] text-[#9aa0a6] leading-relaxed mt-[4px]">
              <span className="font-semibold block mb-[4px]">
                Keamanan & Privasi
              </span>
              Data yang Anda masukkan hanya digunakan untuk proses pendaftaran,
              verifikasi akun, dan keamanan layanan. Jangan pernah membagikan
              kata sandi atau kode verifikasi kepada siapa pun.
            </p>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              className="bg-[#0d1b4c] text-white rounded-[14px] py-[16px] px-[16px] text-[14px] font-medium w-full mt-[10px] hover:bg-opacity-90 transition-opacity flex items-center justify-center"
            >
              Simpan Kata Sandi Baru
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        open={Boolean(success)}
        title={isResetDone ? 'Kata sandi berhasil direset' : 'Kode terkirim'}
        message={success}
        onClose={() => {
          setSuccess('')
          if (isResetDone) {
            setIsResetDone(false)
            onBackClick?.()
          }
        }}
      />

      {/* Error Modal */}
      <ErrorModal
        open={Boolean(error)}
        title="Terjadi Kesalahan"
        message={error}
        onClose={() => setError('')}
      />
    </section>
  )
}

export default ForgotPasswordPage
