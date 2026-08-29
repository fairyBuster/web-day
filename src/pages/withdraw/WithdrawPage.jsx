import { useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '../../utils/api'
import backIcon from '../../assets/14_1448.svg'
import arrowRightIcon from '../../assets/14_1490.svg'
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

const quickAmounts = ['100.000', '500.000', '1.000.000']

// Biaya admin penarikan: 10% dari nominal
const WITHDRAW_FEE_PERCENT = 10

// Deteksi pesan error API yang berarti PIN transaksi belum diatur
const isPinSetupError = (msg) => {
  const m = String(msg || '').toLowerCase()
  return (
    /(belum|tidak).*pin/.test(m) ||
    /pin.*(belum|tidak)/.test(m) ||
    /pin.*(not set|not yet set)/.test(m) ||
    /(not set|not yet set|set first).*pin/.test(m)
  )
}

function WithdrawPage({ onBackClick, onAddBankAccount, onEditPin }) {
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [userBanks, setUserBanks] = useState([])
  const [selectedBankId, setSelectedBankId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showPinSetup, setShowPinSetup] = useState(false)
  const [balance, setBalance] = useState(null) // null = belum termuat
  const pinInputRef = useRef(null)

  // Ambil daftar rekening milik user untuk dipilih sebagai tujuan
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
          setError(
            `Terjadi kesalahan koneksi. Tolong segarkan halamannya.`,
          )
          return
        }
        const data = parseResponse(json)
        if (!res.ok) {
          setError(getErrorMessage(data, 'Gagal memuat rekening tujuan.'))
          return
        }
        const list = Array.isArray(data) ? data : data.results
        if (Array.isArray(list) && list.length > 0) {
          setUserBanks(list)
          setSelectedBankId(
            list.find((b) => b.is_default)?.id ?? list[0].id,
          )
        }
      } catch (err) {
        setError(
          'Terjadi kesalahan koneksi. Tolong segarkan halamannya.',
        )
      }
    }
    loadUserBanks()
  }, [])

  // Cek status PIN transaksi — kalau belum diatur, langsung tampilkan notifikasi
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
        if (data && data.pin_set === false) setShowPinSetup(true)
      } catch (err) {
        // Abaikan — kalau cek gagal, jangan sampai menghalangi halaman
      }
    }
    checkPinStatus()
  }, [])

  // Ambil saldo user dari account-info untuk "Saldo Tersedia" & "Tarik Semua"
  useEffect(() => {
    const loadBalance = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const res = await fetch(`${API_BASE}/api/auth/account-info/`, {
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
        if (data && data.balance !== undefined) setBalance(data.balance)
      } catch (err) {
        // Abaikan — saldo tetap tampil dengan nilai fallback
      }
    }
    loadBalance()
  }, [])

  // Nominal bersih (hanya digit) agar aman dari format ribuan (contoh: 100.000)
  const rawAmount = Number(String(amount || '').replace(/\D/g, '')) || 0
  // Biaya admin & total diterima untuk ringkasan
  const adminFee = Math.round((rawAmount * WITHDRAW_FEE_PERCENT) / 100)
  const totalReceived = rawAmount - adminFee

  const formattedAmount = rawAmount
    ? `Rp${rawAmount.toLocaleString('id-ID')}`
    : 'Rp0'

  const handlePinChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
    setPin(digits)
  }

  const handleWithdraw = async () => {
    const numericAmount = Number(String(amount || '').replace(/\D/g, '')) || 0
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setError('Masukkan jumlah penarikan yang valid.')
      return
    }
    if (numericAmount < 35000) {
      setError('Minimum penarikan adalah Rp35.000.')
      return
    }
    if (!selectedBankId) {
      setError('Pilih rekening tujuan terlebih dahulu.')
      return
    }
    if (pin.length !== 6) {
      setError('PIN transaksi harus 6 digit.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_BASE}/api/withdraw/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          amount: String(numericAmount),
          bank_account_id: selectedBankId,
          pin,
          service_id: 0,
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
        const pesan =
          data.detail ||
          data.non_field_errors?.[0] ||
          data.amount?.[0] ||
          data.pin?.[0] ||
          data.bank_account?.[0] ||
          data.bank_account_id?.[0] ||
          data.service_id?.[0] ||
          ''
        // PIN transaksi belum diatur → arahkan ke halaman sandi transaksi
        if (isPinSetupError(pesan)) {
          setShowPinSetup(true)
          return
        }
        // PIN salah (non_field_errors: ["Invalid PIN."]) → notifikasi jelas
        if (pesan.toLowerCase().includes('invalid pin')) {
          setError('PIN transaksi salah.')
          return
        }
        setError(getErrorMessage(data, 'Gagal melakukan penarikan.'))
        return
      }
      setSuccessMessage(
        data.detail ||
          `Penarikan Rp${Number(data.amount || numericAmount).toLocaleString(
            'id-ID',
          )} berhasil diajukan (${data.status || 'PENDING'}).`,
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

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header Section */}
      <div className="max-w-md mx-auto bg-primary pt-3 pb-6 px-5">
        {/* Top Navigation Bar */}
        <div className="flex items-center mb-8">
          <button
            type="button"
            onClick={onBackClick}
            className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity"
            aria-label="Back"
          >
            <img src={backIcon} alt="Back" className="w-4 h-4" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg mr-6 text-white">
            Penarikan
          </h1>
        </div>

        {/* Available Balance Display */}
        <div className="px-1 pb-2">
          <p className="text-[#b7c0dd] text-sm mb-1">Saldo Tersedia</p>
          <p className="text-3xl font-bold tracking-tight text-white">
            {balance !== null
              ? `Rp${Number(balance).toLocaleString('id-ID', {
                  maximumFractionDigits: 0,
                })}`
              : 'Memuat...'}
          </p>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="max-w-md mx-auto bg-primary">
        {/* White container with rounded top corners */}
        <div className="bg-white rounded-t-3xl px-5 py-6 pb-10 flex flex-col gap-6 min-h-screen">
          {/* Amount Input Area */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-textDark text-sm font-medium">
                Jumlah Penarikan
              </label>
              <button
                type="button"
                onClick={() =>
                  balance !== null &&
                  setAmount(String(Math.trunc(Number(balance))))
                }
                className="text-primary text-sm font-medium hover:underline"
              >
                Tarik Semua
              </button>
            </div>
            <div className="border border-brand-border rounded-xl p-4 flex items-center gap-2 mb-2 focus-within:border-primary transition-colors">
              <span className="text-textDark font-medium">Rp</span>
              <input
                type="text"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/\D/g, '').slice(0, 9))
                }
                placeholder="0"
                className="flex-1 outline-none text-textDark placeholder-[#b0b4ba] bg-transparent font-medium w-full"
              />
            </div>
            <p className="text-textLight text-xs">Minimum penarikan Rp35.000</p>
          </div>

          {/* Quick Amount Selection Buttons */}
          <div className="flex gap-3">
            {quickAmounts.map((quick) => {
              const isSelected = amount === quick
              return (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setAmount(quick)}
                  className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
                    isSelected
                      ? 'border border-primary bg-[#dbe9fb] text-primary'
                      : 'border border-brand-border text-textDark hover:bg-gray-50'
                  }`}
                >
                  Rp{quick}
                </button>
              )
            })}
          </div>

          {/* Destination Account Selection */}
          <div>
            <h3 className="text-textDark text-sm font-medium mb-3">
              Rekening Tujuan
            </h3>
            {userBanks.length === 0 ? (
              <div
                onClick={onAddBankAccount}
                className="bg-[#f5f7fd] border border-primary rounded-xl p-4 flex items-center gap-4 mb-3 cursor-pointer hover:bg-[#eef2fc] transition-colors"
              >
                {/* Bank Icon Placeholder */}
                <div className="w-10 h-10 bg-imageBg border border-imageBorder rounded-lg shrink-0"></div>
                <div className="flex-1">
                  <p className="text-textDark text-sm font-medium mb-0.5">
                    Tambahkan rekening
                  </p>
                  <p className="text-[#6a6d72] text-xs mb-0.5">-</p>
                  <p className="text-textLight text-xs">a.n. -</p>
                </div>
                <img src={arrowRightIcon} alt="Arrow Right" className="w-4 h-4" />
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-3">
                {userBanks.map((bank) => {
                  const isSelected = bank.id === selectedBankId
                  return (
                    <button
                      key={bank.id}
                      type="button"
                      onClick={() => setSelectedBankId(bank.id)}
                      className={`bg-[#f5f7fd] border rounded-xl p-4 flex items-center gap-4 text-left transition-colors ${
                        isSelected
                          ? 'border-primary'
                          : 'border-brand-border hover:bg-[#eef2fc]'
                      }`}
                    >
                      {/* Bank Icon Placeholder */}
                      <div className="w-10 h-10 bg-imageBg border border-imageBorder rounded-lg shrink-0 flex items-center justify-center text-[16px] font-bold text-textGray">
                        {bank.bank_name
                          ? bank.bank_name.trim().charAt(0).toUpperCase()
                          : 'B'}
                      </div>
                      <div className="flex-1">
                        <p className="text-textDark text-sm font-medium mb-0.5">
                          {bank.bank_name}
                        </p>
                        <p className="text-[#6a6d72] text-xs mb-0.5">
                          {bank.account_number
                            ? `•••• ${bank.account_number.slice(-4)}`
                            : '-'}
                        </p>
                        <p className="text-textLight text-xs">
                          a.n. {bank.account_name || '-'}
                        </p>
                      </div>
                      {bank.is_default && (
                        <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full shrink-0">
                          Utama
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
            <button
              type="button"
              onClick={onAddBankAccount}
              className="text-primary text-sm font-medium hover:underline"
            >
              + Tambahkan rekening baru
            </button>
          </div>

          {/* Transaction Summary Box */}
          <div>
            <h3 className="text-textDark text-sm font-medium mb-3">Ringkasan</h3>
            <div className="bg-[#f7f8fa] rounded-xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-textGray text-sm">Jumlah Penarikan</span>
                <span className="text-textDark text-sm font-medium">
                  {formattedAmount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-textGray text-sm">Biaya Admin</span>
                <span className="text-textDark text-sm font-medium">
                  {rawAmount ? `Rp${adminFee.toLocaleString('id-ID')}` : 'Rp0'}
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-brand-border pt-3 mt-1">
                <span className="text-textDark text-sm font-bold">
                  Total Diterima
                </span>
                <span className="text-primary text-sm font-bold">
                  {rawAmount
                    ? `Rp${totalReceived.toLocaleString('id-ID')}`
                    : 'Rp0'}
                </span>
              </div>
            </div>
          </div>

          {/* PIN Input Area */}
          <div>
            <h3 className="text-textDark text-sm font-medium mb-3">
              Masukkan PIN Transaksi{' '}
              <span
                onClick={onEditPin}
                className="text-textLight font-normal text-xs ml-1 cursor-pointer hover:underline"
              >
                (edit pin transaksi)
              </span>
            </h3>
            {/* Hidden input to capture PIN */}
            <input
              ref={pinInputRef}
              type="text"
              inputMode="numeric"
              value={pin}
              onChange={handlePinChange}
              className="sr-only"
              aria-label="PIN Transaksi"
            />
            <button
              type="button"
              className="flex gap-2 mb-3 w-full"
              onClick={() => pinInputRef.current?.focus()}
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className={`w-11 h-12 border rounded-xl flex items-center justify-center bg-white ${
                    pin[index] ? 'border-primary' : 'border-brand-border'
                  }`}
                >
                  {pin[index] && (
                    <div className="w-2 h-2 bg-textDark rounded-full"></div>
                  )}
                </div>
              ))}
            </button>
            <p className="text-textLight text-xs">
              PIN digunakan untuk mengonfirmasi transaksi penarikan Anda
            </p>
          </div>

          {/* Information/Warning Box */}
          <div className="bg-[#fbeed4] rounded-xl p-4 mb-2">
            <ul className="text-[#6a4f16] text-xs space-y-2 pl-4 list-disc marker:text-[#6a4f16]">
              <li className="pl-1">
                Penarikan diproses dalam 1x24 jam pada hari kerja.
              </li>
              <li className="pl-1">
                Pastikan data rekening tujuan sudah benar sebelum melanjutkan.
              </li>
              <li className="pl-1">
                Maksimal penarikan per hari Rp10.000.000.
              </li>
            </ul>
          </div>

          {/* Primary Submit Button */}
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={submitting}
            className="w-full bg-primary text-white font-semibold py-4 rounded-full hover:bg-opacity-90 transition-colors mt-2 disabled:opacity-60"
          >
            {submitting ? 'Memproses...' : 'Konfirmasi Penarikan'}
          </button>
        </div>
      </div>

      {/* Error Modal */}
      <ErrorModal
        open={Boolean(error)}
        title="Gagal Melakukan Penarikan"
        message={error}
        onClose={() => setError('')}
      />

      {/* Modal notifikasi: PIN transaksi belum diatur */}
      <ErrorModal
        open={showPinSetup}
        title="PIN Transaksi Belum Diatur"
        message="Anda belum mengatur kata sandi transaksi (PIN penarikan). Silakan atur PIN terlebih dahulu untuk melanjutkan penarikan."
        buttonText="Atur Sekarang"
        secondaryText="Nanti Saja"
        onAction={() => {
          setShowPinSetup(false)
          onEditPin?.()
        }}
        onSecondary={() => setShowPinSetup(false)}
        onClose={() => setShowPinSetup(false)}
      />

      {/* Success Modal */}
      <SuccessModal
        open={showSuccess}
        title="Penarikan Berhasil"
        message={successMessage}
        onClose={() => {
          setShowSuccess(false)
          onBackClick?.()
        }}
      />
    </div>
  )
}

export default WithdrawPage
