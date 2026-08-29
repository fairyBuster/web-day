import bgImg from '../assets/fb2ec6881c8e7cac3153b3a57d19c876a87ec705.png'

function LandingPage({ onLoginClick, onRegisterClick, onTermsClick }) {
  return (
    <section className="relative min-h-screen w-full flex flex-col justify-end overflow-hidden bg-gray-900">
      {/* Background Image */}
      <img
        src={bgImg}
        alt="Offshore oil rig at dusk"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />

      {/* Bottom Sheet Container */}
      <div className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-[32px] px-6 pt-8 pb-10 shadow-2xl flex flex-col items-center">
        {/* Header Text Group */}
        <div className="w-full flex flex-col items-center mb-8">
          <h1 className="text-[22px] font-bold text-brand-text mb-3">
            Selamat Datang
          </h1>
          <p className="text-[14px] text-brand-muted text-center leading-relaxed px-2">
            Akses akun Anda dengan aman atau daftar untuk mulai menggunakan
            layanan kami.
          </p>
        </div>

        {/* Action Buttons Group */}
        <div className="w-full flex flex-col gap-3 mb-8">
          <button
            type="button"
            onClick={onLoginClick}
            className="w-full bg-brand-dark text-white font-semibold text-[15px] py-[16px] rounded-[14px] hover:bg-blue-900 transition-colors duration-200 flex justify-center items-center"
          >
            Masuk
          </button>

          <button
            type="button"
            onClick={onRegisterClick}
            className="w-full bg-white border border-brand-border text-brand-text font-semibold text-[15px] py-[16px] rounded-[14px] hover:bg-gray-50 transition-colors duration-200 flex justify-center items-center"
          >
            Daftar Akun Baru
          </button>
        </div>

        {/* Terms and Conditions Text */}
        <p className="text-[11px] text-gray-400 text-center px-6 leading-relaxed">
          Dengan melanjutkan, Anda menyetujui{' '}
          <button
            type="button"
            onClick={onTermsClick}
            className="text-red-500 font-medium hover:underline"
          >
            Syarat & Ketentuan
          </button>{' '}
          yang berlaku.
        </p>
      </div>
    </section>
  )
}

export default LandingPage
