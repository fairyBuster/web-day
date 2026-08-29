import backIcon from '../assets/5_11.svg'

const sections = [
  {
    number: 1,
    title: 'Ketentuan Umum',
    paragraphs: [
      'Layanan ini disediakan untuk pengguna yang telah berusia minimal 18 tahun dan memiliki kapasitas hukum untuk mengikatkan diri dalam perjanjian.',
      'Kami berhak mengubah, menambah, atau menghentikan sebagian maupun seluruh layanan sewaktu-waktu dengan pemberitahuan sebelumnya.',
    ],
  },
  {
    number: 2,
    title: 'Pendaftaran Akun',
    paragraphs: [
      'Pengguna wajib memberikan data yang benar, lengkap, dan terkini pada saat proses pendaftaran, termasuk nomor telepon yang aktif dan valid.',
      'Satu nomor telepon hanya dapat digunakan untuk satu akun. Kami berhak menonaktifkan akun yang terindikasi menggunakan data palsu.',
    ],
  },
  {
    number: 3,
    title: 'Keamanan Akun',
    paragraphs: [
      'Pengguna bertanggung jawab penuh atas kerahasiaan kata sandi dan seluruh aktivitas yang terjadi melalui akunnya.',
      'Segera laporkan kepada kami apabila terjadi akses tidak sah atau dugaan penyalahgunaan akun.',
    ],
  },
  {
    number: 4,
    title: 'Kewajiban Pengguna',
    paragraphs: [
      'Pengguna dilarang menggunakan layanan untuk tujuan yang melanggar hukum, merugikan pihak lain, atau mengganggu jalannya sistem.',
    ],
  },
  {
    number: 5,
    title: 'Privasi Data',
    paragraphs: [
      'Data pribadi yang Anda berikan akan dikelola sesuai dengan kebijakan privasi kami dan tidak akan dibagikan kepada pihak ketiga tanpa persetujuan, kecuali diwajibkan oleh peraturan yang berlaku.',
    ],
  },
  {
    number: 6,
    title: 'Batasan Tanggung Jawab',
    paragraphs: [
      'Kami tidak bertanggung jawab atas kerugian tidak langsung yang timbul akibat gangguan teknis, kesalahan input data, atau kondisi di luar kendali kami.',
    ],
  },
  {
    number: 7,
    title: 'Perubahan Ketentuan',
    paragraphs: [
      'Kami dapat memperbarui syarat dan ketentuan ini dari waktu ke waktu. Penggunaan layanan setelah perubahan berarti Anda menyetujui ketentuan yang telah diperbarui.',
    ],
  },
]

function TermsPage({ onBackClick }) {
  return (
    <>
      {/* Header Section: Sticky top bar with back button and title */}
      <section className="flex justify-center w-full bg-gray-100">
        <div className="w-full max-w-md md:max-w-2xl lg:max-w-3xl bg-white border-b border-[#eceef1] sticky top-0 z-10">
          <div className="px-5 md:px-8 py-[18px] flex items-center gap-3.5">
            {/* Back Button */}
            <button
              type="button"
              onClick={onBackClick}
              className="w-8 h-8 bg-[#f7f8fa] rounded-[10px] flex items-center justify-center shrink-0 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
              aria-label="Go back"
            >
              <img src={backIcon} alt="" className="w-[18px] h-[18px]" />
            </button>
            {/* Page Title */}
            <h1 className="text-[#1c1c1e] font-semibold text-base md:text-lg">
              Syarat dan Ketentuan
            </h1>
          </div>
        </div>
      </section>

      {/* Content Section: Scrollable terms and conditions list */}
      <section className="flex justify-center w-full bg-gray-100 min-h-screen">
        <div className="w-full max-w-md md:max-w-2xl lg:max-w-3xl bg-[#eceef1] px-5 md:px-8 pt-5 md:pt-8 pb-8 md:pb-12 flex flex-col gap-5 md:gap-8">
          {/* Last Updated Date */}
          <div>
            <p className="text-[#9aa0a6] text-[13px] md:text-sm">
              Terakhir diperbarui: 22 Agustus 2026
            </p>
          </div>

          {/* Introduction Paragraph */}
          <div>
            <p className="text-[#4a4d52] text-[14px] md:text-base leading-relaxed">
              Dengan mendaftar dan menggunakan aplikasi ini, Anda menyetujui
              seluruh syarat dan ketentuan berikut. Mohon baca dengan saksama
              sebelum melanjutkan proses pendaftaran.
            </p>
          </div>

          {/* Term Sections */}
          {sections.map((section) => (
            <div key={section.number} className="flex flex-col gap-2 md:gap-3">
              <div className="flex items-baseline gap-2">
                <span className="text-[#e0342c] font-semibold text-[14px] md:text-base">
                  {section.number}.
                </span>
                <h2 className="text-[#1c1c1e] font-semibold text-[14px] md:text-base">
                  {section.title}
                </h2>
              </div>
              {section.paragraphs.map((paragraph, i) => (
                <p
                  key={i}
                  className="text-[#4a4d52] text-[14px] md:text-base leading-relaxed"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          ))}

          {/* Bottom Highlight Box: Keamanan & Privasi */}
          <div className="bg-[#f7f8fa] rounded-xl p-4 md:p-6 mt-1 md:mt-4 shadow-sm">
            <p className="text-[#9aa0a6] text-[13px] md:text-sm leading-relaxed">
              <span className="block mb-1.5 font-semibold text-[#4a4d52]">
                Keamanan & Privasi
              </span>
              Data yang Anda masukkan hanya digunakan untuk proses pendaftaran,
              verifikasi akun, dan keamanan layanan. Jangan pernah membagikan
              kata sandi atau kode verifikasi kepada siapa pun.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

export default TermsPage
