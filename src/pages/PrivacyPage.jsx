import backIcon from '../assets/5_11.svg'

const sections = [
  {
    number: 1,
    title: 'Informasi yang Kami Kumpulkan',
    paragraphs: [
      'Kami mengumpulkan data yang Anda berikan secara langsung, seperti nama, nomor telepon, alamat email, serta data transaksi dan aktivitas penggunaan layanan di dalam aplikasi.',
      'Kami juga dapat mengumpulkan data teknis seperti jenis perangkat, versi aplikasi, alamat IP, dan log aktivitas untuk meningkatkan kualitas layanan.',
    ],
  },
  {
    number: 2,
    title: 'Penggunaan Informasi',
    paragraphs: [
      'Informasi yang kami kumpulkan digunakan untuk memproses transaksi, memverifikasi akun, memberikan layanan pelanggan, serta menyesuaikan layanan dengan kebutuhan Anda.',
      'Data juga digunakan untuk keperluan keamanan, pencegahan penipuan, dan pemenuhan kewajiban hukum yang berlaku.',
    ],
  },
  {
    number: 3,
    title: 'Keamanan Data',
    paragraphs: [
      'Kami menerapkan langkah-langkah keamanan teknis dan organisasi untuk melindungi data Anda dari akses tidak sah, perubahan, pengungkapan, atau penghancuran yang tidak sah.',
      'Kata sandi dan data sensitif lainnya disimpan dalam bentuk terenkripsi dan hanya dapat diakses oleh pihak yang berwenang.',
    ],
  },
  {
    number: 4,
    title: 'Berbagi Informasi',
    paragraphs: [
      'Kami tidak menjual, menyewakan, atau membagikan data pribadi Anda kepada pihak ketiga tanpa persetujuan, kecuali diwajibkan oleh peraturan perundang-undangan yang berlaku.',
      'Data dapat dibagikan kepada mitra layanan terpercaya semata-mata untuk mendukung operasional layanan, seperti pemroses pembayaran, dengan kewajiban menjaga kerahasiaan data.',
    ],
  },
  {
    number: 5,
    title: 'Hak Pengguna',
    paragraphs: [
      'Anda berhak mengakses, memperbaiki, atau memperbarui data pribadi Anda melalui menu pengaturan akun di dalam aplikasi.',
      'Anda juga dapat mengajukan permintaan penghapusan data atau menarik persetujuan penggunaan data dengan menghubungi layanan pelanggan kami.',
    ],
  },
  {
    number: 6,
    title: 'Perubahan Kebijakan',
    paragraphs: [
      'Kami dapat memperbarui kebijakan privasi ini dari waktu ke waktu. Setiap perubahan akan diumumkan melalui aplikasi atau kanal resmi lainnya.',
      'Penggunaan aplikasi setelah perubahan kebijakan berarti Anda menyetujui kebijakan privasi yang telah diperbarui.',
    ],
  },
]

function PrivacyPage({ onBackClick }) {
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
              Kebijakan Privasi
            </h1>
          </div>
        </div>
      </section>

      {/* Content Section: Scrollable privacy policy list */}
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
              Kebijakan privasi ini menjelaskan bagaimana kami mengumpulkan,
              menggunakan, dan melindungi data pribadi Anda saat menggunakan
              aplikasi ini. Mohon baca dengan saksama.
            </p>
          </div>

          {/* Privacy Sections */}
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

          {/* Bottom Highlight Box: Kontak */}
          <div className="bg-[#f7f8fa] rounded-xl p-4 md:p-6 mt-1 md:mt-4 shadow-sm">
            <p className="text-[#9aa0a6] text-[13px] md:text-sm leading-relaxed">
              <span className="block mb-1.5 font-semibold text-[#4a4d52]">
                Hubungi Kami
              </span>
              Apabila Anda memiliki pertanyaan terkait kebijakan privasi atau
              pengelolaan data pribadi, silakan hubungi layanan pelanggan kami
              melalui menu bantuan di dalam aplikasi.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

export default PrivacyPage
