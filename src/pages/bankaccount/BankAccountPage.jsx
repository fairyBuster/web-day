import { useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import backIcon from '../../assets/18_7.svg'
import dropdownIcon from '../../assets/18_29.svg'
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

function BankAccountPage({ onBackClick }) {
  const [banks, setBanks] = useState([])
  const [loadingBanks, setLoadingBanks] = useState(true)
  const [userBanks, setUserBanks] = useState([])
  const [bank, setBank] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Ambil daftar bank aktif untuk dropdown
  useEffect(() => {
    const loadBanks = async () => {
      setLoadingBanks(true)
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`${API_BASE}/api/banks/`, {
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
          setError(getErrorMessage(data, 'Gagal memuat daftar bank.'))
          return
        }
        const list = Array.isArray(data) ? data : data.results
        setBanks(Array.isArray(list) ? list : [])
      } catch (err) {
        setError(
          'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
        )
      } finally {
        setLoadingBanks(false)
      }
    }
    loadBanks()
  }, [])

  // Ambil rekening user yang sudah diikat (kalau sudah pernah simpan)
  useEffect(() => {
    const loadUserBanks = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`${API_BASE}/api/banks/user/`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        let json
        try {
          json = await res.json()
        } catch (parseErr) {
          return
        }
        const data = parseResponse(json)
        if (!res.ok) return
        const list = Array.isArray(data) ? data : data.results
        setUserBanks(Array.isArray(list) ? list : [])
      } catch (err) {
        // Abaikan — form tetap bisa dipakai untuk mengikat baru
      }
    }
    loadUserBanks()
  }, [])

  const handleSubmit = async () => {
    // Validasi sederhana sebelum kirim
    if (!bank) {
      setError('Silakan pilih bank terlebih dahulu.')
      return
    }
    if (!accountNumber.trim()) {
      setError('Nomor rekening wajib diisi.')
      return
    }
    if (!ownerName.trim()) {
      setError('Nama pemilik rekening wajib diisi.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/banks/user/`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...(isEditing ? { id: savedBank.id } : {}),
          bank: Number(bank),
          account_name: ownerName.trim(),
          account_number: accountNumber.trim(),
          phone: '',
          is_default: true,
        }),
      })
      let json
      try {
        json = await res.json()
      } catch (parseErr) {
        setError(
          `Terjadi kesalahan koneksi. Tolong segarkan halamannya.`,
        )
        return
      }
      const data = parseResponse(json)
      if (!res.ok) {
        setError(
          getErrorMessage(data, 'Gagal menyimpan rekening.'),
        )
        return
      }
      setSuccessMessage(
        isEditing
          ? 'Rekening bank berhasil diperbarui.'
          : 'Rekening bank berhasil diikat.',
      )
      setShowSuccess(true)
    } catch (err) {
      setError(
        'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const maskedNumber =
    accountNumber.length > 0
      ? `•••• •••• •••• ${accountNumber.slice(-4)}`
      : '•••• •••• •••• ••••'

  // Rekening tersimpan: tampilkan yang default (fallback: yang pertama)
  const savedBank = userBanks.find((b) => b.is_default) ?? userBanks[0] ?? null
  const getBankName = (bankId) =>
    banks.find((b) => Number(b.id) === Number(bankId))?.name || '-'
  const maskAccountNumber = (num) => {
    const digits = String(num || '').replace(/\D/g, '')
    return digits ? `•••• •••• •••• ${digits.slice(-4)}` : maskedNumber
  }

  // Mode edit: selama ada rekening tersimpan, submit pakai PUT (edit)
  const isEditing = Boolean(savedBank)

  // Isi form otomatis dari rekening tersimpan (hanya sekali per halaman dibuka)
  const prefilledRef = useRef(false)
  useEffect(() => {
    if (savedBank && !prefilledRef.current) {
      prefilledRef.current = true
      setBank(String(savedBank.bank))
      setAccountNumber(String(savedBank.account_number || ''))
      setOwnerName(savedBank.account_name || '')
    }
  }, [savedBank])

  return (
    <div className="min-h-screen font-sans">
      {/* Header Section: Top navigation bar with back button and title */}
      <section className="max-w-md mx-auto bg-primary text-white flex items-center px-4 py-4 sticky top-0 z-10">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBackClick}
          className="p-1 hover:bg-white/10 rounded-full transition-colors"
          aria-label="Go back"
        >
          <img src={backIcon} alt="" className="w-5 h-5" />
        </button>
        {/* Page Title */}
        <h1 className="flex-1 text-center text-[16px] font-medium pr-6">
          Ikat Kartu Bank
        </h1>
      </section>

      {/* Card Preview Section */}
      <section className="max-w-md mx-auto bg-background px-5 pt-6 pb-2">
        {savedBank && (
          <p className="text-[11px] text-textLight mb-2">
            Rekening tersimpan (digunakan untuk penarikan)
          </p>
        )}
        {/* Card Container with Gradient */}
        <div className="bg-gradient-to-br from-[#0d1b4c] to-[#1c3080] rounded-[16px] p-5 text-white shadow-md flex flex-col gap-9">
          {/* Card Chip Placeholder */}
          <div className="w-[38px] h-[28px] bg-white/25 rounded-[5px]"></div>

          {/* Masked Card Number */}
          <div className="text-[20px] tracking-[0.2em] font-medium mt-2">
            {savedBank
              ? maskAccountNumber(savedBank.account_number)
              : maskedNumber}
          </div>

          {/* Card Footer Details */}
          <div className="flex justify-between items-end mt-1">
            <span className="text-[12px] text-white/90">
              {savedBank?.account_name ||
                ownerName ||
                'Nama Pemilik Rekening'}
            </span>
            <span className="text-[14px] font-semibold">
              {savedBank
                ? savedBank.bank_name || getBankName(savedBank.bank)
                : getBankName(bank)}
            </span>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="max-w-md mx-auto bg-background px-5 py-4 flex flex-col gap-5">
        {/* Bank Selection Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-textDark">
            Pilih Bank
          </label>
          <div className="relative">
            <select
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className={`w-full appearance-none bg-white border border-brand-border rounded-[12px] px-4 py-3.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer ${
                bank ? 'text-textDark' : 'text-[#b0b4ba]'
              }`}
            >
              <option value="" disabled>
                {loadingBanks ? 'Memuat bank...' : 'Pilih Bank Tujuan'}
              </option>
              {banks.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            {/* Custom Dropdown Icon */}
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <img src={dropdownIcon} alt="" className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Account Number Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-textDark">
            Nomor Rekening
          </label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) =>
              setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 16))
            }
            placeholder="Masukkan Nomor Rekening"
            className="w-full bg-white border border-brand-border rounded-[12px] px-4 py-3.5 text-textDark text-[14px] placeholder-[#b0b4ba] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        {/* Account Owner Name Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-textDark">
            Nama Pemilik Rekening
          </label>
          <input
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Sesuai dengan kartu bank"
            className="w-full bg-white border border-brand-border rounded-[12px] px-4 py-3.5 text-textDark text-[14px] placeholder-[#b0b4ba] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <p className="text-[11px] text-textLight mt-0.5">
            Nama harus sama persis dengan yang terdaftar di bank
          </p>
        </div>
      </section>

      {/* Footer Section */}
      <section className="max-w-md mx-auto bg-background px-5 pt-2 pb-12 min-h-[calc(100vh-550px)] flex flex-col justify-between">
        {/* Information Alert Box */}
        <div className="bg-[#fbeed4] rounded-[12px] p-3.5 flex gap-3 items-start mb-8">
          {/* Info Icon */}
          <div className="w-[18px] h-[18px] rounded-full bg-[#d6a13a] flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-[11px] font-bold italic leading-none">
              i
            </span>
          </div>
          {/* Info Text */}
          <p className="text-[12px] text-[#6a4f16] leading-snug">
            Pastikan data rekening yang dimasukkan benar. Rekening yang sudah
            diikat akan digunakan sebagai tujuan penarikan dana.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || loadingBanks}
          className="w-full bg-primary text-white text-[15px] font-medium py-3.5 rounded-[24px] hover:bg-[#1c3080] active:scale-[0.98] transition-all shadow-sm mt-auto disabled:opacity-60"
        >
          {submitting
            ? 'Menyimpan...'
            : isEditing
              ? 'Simpan Perubahan'
              : 'Simpan Rekening'}
        </button>
      </section>

      {/* Error Modal */}
      <ErrorModal
        open={Boolean(error)}
        title={isEditing ? 'Gagal Memperbarui Rekening' : 'Gagal Menyimpan Rekening'}
        message={error}
        onClose={() => setError('')}
      />

      {/* Success Modal */}
      <SuccessModal
        open={showSuccess}
        title={isEditing ? 'Rekening Berhasil Diperbarui' : 'Rekening Berhasil Disimpan'}
        message={successMessage}
        onClose={() => {
          setShowSuccess(false)
          onBackClick?.()
        }}
      />
    </div>
  )
}

export default BankAccountPage
