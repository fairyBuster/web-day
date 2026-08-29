import successIcon from '../assets/12_938.svg'

function SuccessModal({ open, title, message, buttonText = 'Oke', onClose }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-[#eceef1]/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans"
      onClick={onClose}
    >
      {/* Main Card Container */}
      <div
        className="bg-[#ffffff] rounded-[18px] w-[312px] px-[24px] pt-[28px] pb-[24px] flex flex-col items-center text-center gap-[7.4px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success Icon Wrapper */}
        <div className="w-[60px] h-[60px] bg-[#e0f3e1] rounded-full flex items-center justify-center shrink-0">
          <img src={successIcon} alt="Success Icon" className="w-[30px] h-[30px]" />
        </div>

        {/* Title */}
        <div className="pt-[10.6px] w-full flex justify-center">
          <h2 className="text-[#1c1c1e] font-bold text-[16px] leading-tight">
            {title}
          </h2>
        </div>

        {/* Subtitle */}
        {message && (
          <div className="pb-[16.6px] w-full flex justify-center">
            <p className="text-[#6a6d72] text-[13px] leading-tight">{message}</p>
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="bg-[#0d1b4c] text-[#ffffff] w-full py-[14px] rounded-[24px] text-[14px] font-medium hover:bg-opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0d1b4c]"
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}

export default SuccessModal
