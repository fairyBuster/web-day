import closeIcon from '../assets/32_783.svg'

const dataRows = [
  { label: 'Nama Perusahaan', value: 'Petro Oil and Gas Inc.' },
  { label: 'Identifikasi', value: 'CNE1000007Q1' },
  { label: 'Nomor Induk Berusaha', value: '1234567890123' },
  { label: 'Bidang Usaha', value: 'Mineral Energi' },
  { label: 'Terdaftar Sejak', value: '6 Apr 2000' },
]

function LisensiModal({ open, onClose }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-[#464646]/80 flex items-center justify-center p-4 font-sans"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className="bg-white w-[312px] rounded-[18px] flex flex-col overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-[18px] border-b border-borderGray">
          <h2 className="text-textDark font-bold text-[15px] leading-none">
            Lisensi & Legalitas
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-[26px] h-[26px] bg-borderGray rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            <img src={closeIcon} alt="" className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="px-5 pt-[18px] pb-1.5 flex flex-col">
          {dataRows.map((row) => (
            <div
              key={row.label}
              className="flex justify-between items-start py-[13px] border-b border-borderGray gap-4"
            >
              <span className="text-textLight text-[13px] leading-tight shrink-0">
                {row.label}
              </span>
              <span className="text-textDark text-[13px] font-semibold leading-tight text-right">
                {row.value}
              </span>
            </div>
          ))}

          {/* Disclaimer Text */}
          <div className="pt-3 pb-1">
            <p className="text-textLight text-[11px] leading-[1.4]">
              Informasi di atas merupakan identitas perusahaan yang digunakan sebagai referensi
              legalitas dan informasi badan usaha Petro Oil and Gas Inc.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pt-[14px] pb-[18px] border-t border-borderGray mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-primary text-white py-[13px] rounded-[22px] font-semibold text-[14px] hover:bg-opacity-90 transition-opacity"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

export default LisensiModal
