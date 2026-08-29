function ErrorModal({
  open,
  title,
  message,
  buttonText = 'Oke',
  secondaryText,
  onAction,
  onClose,
  onSecondary,
}) {
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
        {/* Error Icon Wrapper */}
        <div className="w-[60px] h-[60px] bg-[#fde3e3] rounded-full flex items-center justify-center shrink-0">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 6.5v6.5" stroke="#e0342c" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="12" cy="17" r="1.4" fill="#e0342c" />
          </svg>
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
          onClick={onAction ?? onClose}
          className="bg-[#e0342c] text-[#ffffff] w-full py-[14px] rounded-[24px] text-[14px] font-medium hover:bg-opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e0342c]"
        >
          {buttonText}
        </button>

        {/* Secondary Button (opsional, mis. aksi lanjutan) */}
        {secondaryText && (
          <button
            type="button"
            onClick={onSecondary ?? onClose}
            className="w-full py-2 text-[13px] text-textLight hover:text-textGray transition-colors"
          >
            {secondaryText}
          </button>
        )}
      </div>
    </div>
  )
}

export default ErrorModal
