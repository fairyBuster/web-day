import { useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import backIcon from '../../assets/28_368.svg'
import eyeOldIcon from '../../assets/28_385.svg'
import eyeNewIcon from '../../assets/28_397.svg'
import eyeConfirmIcon from '../../assets/28_407.svg'
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

const fields = [
  { key: 'old', label: 'Kata Sandi Lama', placeholder: 'Masukkan Kata Sandi Lama', icon: eyeOldIcon },
  { key: 'new', label: 'Kata Sandi Baru', placeholder: 'Masukkan Kata Sandi Baru', icon: eyeNewIcon },
  { key: 'confirm', label: 'Konfirmasi Kata Sandi Baru', placeholder: 'Konfirmasi Kata Sandi Baru', icon: eyeConfirmIcon },
]

function UbahKataSandiAkunPage({ onBackClick }) {
  const [visible, setVisible] = useState({ old: false, new: false, confirm: false })
  const [values, setValues] = useState({ old: '', new: '', confirm: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  const toggleVisibility = (key) => {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleChange = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!values.old.trim()) {
      setError('Masukkan kata sandi lama Anda.')
      return
    }
    if (!values.new) {
      setError('Masukkan kata sandi baru Anda.')
      return
    }
    if (values.new !== values.confirm) {
      setError('Konfirmasi kata sandi baru tidak cocok.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      let phone = ''
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        phone = user.phone || user.user_phone || ''
      } catch (parseErr) {
        phone = ''
      }
      const res = await fetch(`${API_BASE}/api/auth/change-password/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          phone,
          old_password: values.old,
          new_password: values.new,
          new_password_confirm: values.confirm,
        }),
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
          getErrorMessage(data, 'Gagal mengubah kata sandi.'),
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
    <div className="min-h-screen bg-background font-sans">
      {/* Header Section */}
      <section className="bg-background flex justify-center">
        <div className="w-full max-w-md relative flex items-center justify-center h-14 bg-primary px-4 shadow-sm">
          <button
            type="button"
            onClick={onBackClick}
            className="absolute left-4 p-1 hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Go back"
          >
            <img src={backIcon} alt="Back" className="w-5 h-5" />
          </button>
          <h1 className="text-white font-semibold text-base">Ubah Kata Sandi Akun</h1>
        </div>
      </section>

      {/* Content Section */}
      <section className="bg-background min-h-screen flex justify-center pb-8">
        <div className="w-full max-w-md bg-white flex flex-col shadow-sm">
          <div className="p-5 flex-1 flex flex-col">
            {/* Header Text Area */}
            <div className="mb-8">
              <h2 className="text-textDark text-lg font-bold mb-1.5">Ubah Kata Sandi Akun</h2>
              <p className="text-textLight text-sm leading-relaxed">
                Masukkan kata sandi lama Anda, lalu buat kata sandi akun yang baru untuk login.
              </p>
            </div>

            {/* Password Change Form */}
            <form className="flex flex-col gap-5 flex-1" onSubmit={handleSubmit}>
              {fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-textDark text-sm font-semibold mb-2">
                    {field.label}
                  </label>
                  <div className="flex items-center border border-[#e2e4e8] rounded-xl px-4 py-3.5 bg-white focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                    <input
                      type={visible[field.key] ? 'text' : 'password'}
                      placeholder={field.placeholder}
                      value={values[field.key]}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="flex-1 outline-none text-sm text-textDark placeholder-[#b0b4ba] bg-transparent w-full"
                    />
                    <button
                      type="button"
                      onClick={() => toggleVisibility(field.key)}
                      className="ml-2 p-1 hover:opacity-70 transition-opacity focus:outline-none"
                      aria-label="Toggle visibility"
                    >
                      <img src={field.icon} alt="Toggle visibility" className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Security Warning Box */}
              <div className="bg-[#fbeed4] rounded-xl p-3.5 flex gap-2.5 items-start mt-2">
                <div className="w-[18px] h-[18px] rounded-full bg-[#d6a13a] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-white text-[10px] font-bold italic font-serif">i</span>
                </div>
                <p className="text-[#6a4f16] text-xs leading-relaxed">
                  Jangan bagikan kata sandi akun Anda kepada siapa pun, termasuk pihak yang
                  mengatasnamakan customer service.
                </p>
              </div>

              {/* Submit Button */}
              <div className="mt-8 mb-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary text-white rounded-full py-[15px] font-semibold text-sm hover:bg-opacity-90 transition-opacity focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:opacity-60"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Error Modal */}
      <ErrorModal
        open={Boolean(error)}
        title="Gagal Mengubah Kata Sandi"
        message={error}
        onClose={() => setError('')}
      />

      {/* Success Modal */}
      <SuccessModal
        open={showSuccess}
        title="Berhasil"
        message="Password berhasil diubah."
        onClose={() => {
          setShowSuccess(false)
          onBackClick()
        }}
      />
    </div>
  )
}

export default UbahKataSandiAkunPage
