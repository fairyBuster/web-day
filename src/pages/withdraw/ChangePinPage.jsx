import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import backIcon from '../../assets/18_243.svg'
import eyeIcon from '../../assets/18_260.svg'
import eyeIcon2 from '../../assets/18_272.svg'
import eyeIcon3 from '../../assets/18_282.svg'
import ErrorModal from '../../components/ErrorModal'
import SuccessModal from '../../components/SuccessModal'

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

function ChangePinPage({ onBackClick }) {
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [password, setPassword] = useState('')
  const [pinSet, setPinSet] = useState(null) // null = belum dicek
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  // Cek status PIN: true = sudah pernah set (wajib current_pin), false = set pertama kali
  useEffect(() => {
    const checkPinStatus = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`${API_BASE}/api/auth/withdraw-pin/`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        if (!res.ok) return
        let json
        try {
          json = await res.json()
        } catch (parseErr) {
          return
        }
        const data = parseResponse(json)
        if (data && typeof data.pin_set === 'boolean') setPinSet(data.pin_set)
      } catch (err) {
        // Abaikan — form tetap tampil dengan mode default
      }
    }
    checkPinStatus()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(newPin)) {
      setError('Kata sandi transaksi baru harus 6 digit angka.')
      return
    }
    if (newPin !== confirmPin) {
      setError('Konfirmasi kata sandi transaksi tidak cocok.')
      return
    }
    if (!password.trim()) {
      setError('Kata sandi akun wajib diisi untuk konfirmasi.')
      return
    }
    if (pinSet && !/^\d{6}$/.test(oldPin)) {
      setError('Kata sandi transaksi lama wajib diisi (6 digit angka).')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const payload = { pin: newPin, password: password.trim() }
      if (pinSet) payload.current_pin = oldPin.trim()
      const res = await fetch(`${API_BASE}/api/auth/withdraw-pin/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })
      let json
      try {
        json = await res.json()
      } catch (parseErr) {
        json = null
      }
      if (!res.ok) {
        const data = json ? parseResponse(json) : {}
        setError(
          getErrorMessage(data, 'Gagal mengubah kata sandi transaksi.'),
        )
        return
      }
      setShowSuccess(true)
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen font-sans">
      {/* Header Section */}
      <section className="w-full max-w-[100%] mx-auto bg-primary h-14 flex items-center px-4 relative">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBackClick}
          className="absolute left-4 w-6 h-6 flex items-center justify-center focus:outline-none"
          aria-label="Back"
        >
          <img src={backIcon} alt="Back" className="w-[18px] h-[18px]" />
        </button>
        {/* Page Title */}
        <h1 className="text-white text-base font-semibold w-full text-center">
          Ubah Kata Sandi Transaksi
        </h1>
      </section>

      {/* Main Content Section */}
      <section className="w-full max-w-[412px] mx-auto bg-white min-h-[calc(100vh-56px)] px-5 py-7 flex flex-col">
        {/* Header Text */}
        <div className="mb-8">
          <h2 className="text-textDark text-lg font-bold mb-2">
            Ubah Kata Sandi Transaksi
          </h2>
          <p className="text-textLight text-sm leading-relaxed">
            {pinSet === false
              ? 'Buat kata sandi transaksi Anda (6 digit angka) untuk keamanan penarikan dana.'
              : 'Masukkan kata sandi transaksi lama Anda, lalu buat kata sandi transaksi yang baru.'}
          </p>
        </div>

        {/* Form Area */}
        <form className="flex-1 flex flex-col" onSubmit={handleSubmit}>
          {/* Old Password Input Group — hanya muncul saat PIN sudah pernah diset */}
          {pinSet !== false && (
            <>
              <div className="mb-2">
                <label className="block text-textDark text-sm font-medium mb-2">
                  Kata Sandi Lama
                </label>
                <div className="flex items-center border border-brand-border rounded-xl px-4 py-[14px] bg-white focus-within:border-primary transition-colors">
                  <input
                    type={showOld ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={6}
                    value={oldPin}
                    onChange={(e) =>
                      setOldPin(e.target.value.replace(/\D/g, ''))
                    }
                    placeholder="Masukkan Kata Sandi Lama"
                    className="w-full outline-none text-sm text-textDark placeholder-[#b0b4ba] bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld((prev) => !prev)}
                    className="ml-2 focus:outline-none"
                    aria-label="Toggle password visibility"
                  >
                    <img
                      src={showOld ? eyeIcon3 : eyeIcon}
                      alt="Toggle Password Visibility"
                      className="w-[18px] h-[18px]"
                    />
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end mb-6">
                <a
                  href="#"
                  className="text-primary text-xs font-medium hover:underline"
                >
                  Lupa Kata Sandi Transaksi?
                </a>
              </div>
            </>
          )}

          {/* Account Password Input Group (konfirmasi login, wajib) */}
          <div className="mb-6">
            <label className="block text-textDark text-sm font-medium mb-2">
              Masukkan kata sandi login Anda
            </label>
            <div className="flex items-center border border-brand-border rounded-xl px-4 py-[14px] bg-white focus-within:border-primary transition-colors">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan Kata Sandi Akun"
                className="w-full outline-none text-sm text-textDark placeholder-[#b0b4ba] bg-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="ml-2 focus:outline-none"
                aria-label="Toggle password visibility"
              >
                <img
                  src={showPassword ? eyeIcon3 : eyeIcon}
                  alt="Toggle Password Visibility"
                  className="w-[18px] h-[18px]"
                />
              </button>
            </div>
          </div>

          {/* New Password Input Group */}
          <div className="mb-6">
            <label className="block text-textDark text-sm font-medium mb-2">
              Setel kata sandi penarikan
            </label>
            <div className="flex items-center border border-brand-border rounded-xl px-4 py-[14px] bg-white focus-within:border-primary transition-colors">
              <input
                type={showNew ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Masukkan Kata Sandi Baru"
                className="w-full outline-none text-sm text-textDark placeholder-[#b0b4ba] bg-transparent"
              />
              <button
                type="button"
                onClick={() => setShowNew((prev) => !prev)}
                className="ml-2 focus:outline-none"
                aria-label="Toggle password visibility"
              >
                <img
                  src={showNew ? eyeIcon3 : eyeIcon2}
                  alt="Toggle Password Visibility"
                  className="w-[18px] h-[18px]"
                />
              </button>
            </div>
          </div>

          {/* Confirm New Password Input Group */}
          <div className="mb-8">
            <label className="block text-textDark text-sm font-medium mb-2">
              Konfirmasi kata sandi penarikan
            </label>
            <div className="flex items-center border border-brand-border rounded-xl px-4 py-[14px] bg-white focus-within:border-primary transition-colors">
              <input
                type={showConfirm ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                value={confirmPin}
                onChange={(e) =>
                  setConfirmPin(e.target.value.replace(/\D/g, ''))
                }
                placeholder="Konfirmasi Kata Sandi Baru"
                className="w-full outline-none text-sm text-textDark placeholder-[#b0b4ba] bg-transparent"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                className="ml-2 focus:outline-none"
                aria-label="Toggle password visibility"
              >
                <img
                  src={showConfirm ? eyeIcon3 : eyeIcon3}
                  alt="Toggle Password Visibility"
                  className="w-[18px] h-[18px]"
                />
              </button>
            </div>
          </div>

          {/* Security Warning Box */}
          <div className="bg-[#fbeed4] rounded-xl p-[14px] flex gap-[10px] mb-10">
            <div className="w-[18px] h-[18px] rounded-full bg-[#d6a13a] flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-white text-[10px] font-bold italic font-serif">
                i
              </span>
            </div>
            <p className="text-[#6a4f16] text-xs leading-relaxed">
              Jangan bagikan kata sandi transaksi Anda kepada siapa pun,
              termasuk pihak yang mengatasnamakan customer service.
            </p>
          </div>

          {/* Submit Button */}
          <div className="mt-auto pb-6">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary hover:bg-blue-900 text-white rounded-full py-[15px] text-sm font-semibold flex justify-center items-center transition-colors disabled:opacity-60"
            >
              {submitting
                ? 'Menyimpan...'
                : pinSet === false
                  ? 'Simpan Kata Sandi'
                  : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </section>

      {/* Error Modal */}
      <ErrorModal
        open={Boolean(error)}
        title="Gagal Mengubah Kata Sandi Transaksi"
        message={error}
        onClose={() => setError('')}
      />

      {/* Success Modal */}
      <SuccessModal
        open={showSuccess}
        title="Berhasil"
        message={
          pinSet === false
            ? 'Kata sandi transaksi berhasil disimpan.'
            : 'Kata sandi transaksi berhasil diperbarui.'
        }
        onClose={() => {
          setShowSuccess(false)
          onBackClick()
        }}
      />
    </div>
  )
}

export default ChangePinPage
