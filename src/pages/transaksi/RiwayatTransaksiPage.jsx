import backIcon from '../../assets/21_1198.svg'
import depositIcon from '../../assets/21_1206.svg'
import arrowDeposit from '../../assets/21_1214.svg'
import referralIcon from '../../assets/21_1218.svg'
import arrowReferral from '../../assets/21_1228.svg'
import produkIcon from '../../assets/51_63.svg'
import arrowProduk from '../../assets/21_1240.svg'
import penarikanIcon from '../../assets/51_71.svg'
import arrowPenarikan from '../../assets/21_1252.svg'
import keuntunganIcon from '../../assets/51_74.svg'
import arrowKeuntungan from '../../assets/21_1264.svg'
import lainnyaIcon from '../../assets/21_1268.svg'
import arrowLainnya from '../../assets/21_1277.svg'

const items = [
  {
    title: 'Riwayat Deposit',
    desc: 'Semua transaksi deposit saldo',
    icon: depositIcon,
    arrow: arrowDeposit,
    bg: 'bg-[#e0f3e1]',
    iconSize: 'w-[20px] h-[20px]',
    action: 'deposit',
  },
  {
    title: 'Bonus Referral',
    desc: 'Bonus dari undangan teman',
    icon: referralIcon,
    arrow: arrowReferral,
    bg: 'bg-[#fbeed4]',
    iconSize: 'w-[20px] h-[20px]',
    action: 'referral',
  },
  {
    title: 'Riwayat Beli Produk',
    desc: 'Pembelian produk investasi',
    icon: produkIcon,
    arrow: arrowProduk,
    bg: 'bg-[#dbe9fb]',
    iconSize: 'w-[16px] h-[16px]',
    action: 'beli',
  },
  {
    title: 'Riwayat Penarikan',
    desc: 'Penarikan dana ke rekening bank',
    icon: penarikanIcon,
    arrow: arrowPenarikan,
    bg: 'bg-[#fbe0dd]',
    iconSize: 'w-[16px] h-[16px]',
    action: 'penarikan',
  },
  {
    title: 'Riwayat Keuntungan',
    desc: 'Keuntungan harian dari investasi',
    icon: keuntunganIcon,
    arrow: arrowKeuntungan,
    bg: 'bg-[#e0f3e1]',
    iconSize: 'w-[16px] h-[16px]',
    action: 'keuntungan',
  },
  {
    title: 'Riwayat Lainnya',
    desc: 'Reward misi, absen, dan hadiah',
    icon: lainnyaIcon,
    arrow: arrowLainnya,
    bg: 'bg-[#f3ddf0]',
    iconSize: 'w-[20px] h-[20px]',
    action: 'lainnya',
  },
]

function RiwayatTransaksiPage({ onBackClick, onDepositClick, onReferralClick, onBeliClick, onPenarikanClick, onKeuntunganClick, onLainnyaClick }) {
  const handleItemClick = (item) => {
    if (item.action === 'deposit') onDepositClick?.()
    if (item.action === 'referral') onReferralClick?.()
    if (item.action === 'beli') onBeliClick?.()
    if (item.action === 'penarikan') onPenarikanClick?.()
    if (item.action === 'keuntungan') onKeuntunganClick?.()
    if (item.action === 'lainnya') onLainnyaClick?.()
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header Section */}
      <section className="bg-background flex justify-center">
        <div className="w-full max-w-md bg-primary relative flex items-center justify-center h-14 px-4 shadow-sm">
          <button
            type="button"
            onClick={onBackClick}
            className="absolute left-4 flex items-center justify-center w-6 h-6 hover:opacity-80 transition-opacity"
            aria-label="Go back"
          >
            <img src={backIcon} alt="Back" className="w-[18px] h-[18px]" />
          </button>
          <h1 className="text-white font-semibold text-base tracking-wide">
            Riwayat Transaksi
          </h1>
        </div>
      </section>

      {/* Transaction List Section */}
      <section className="bg-background min-h-screen pb-10 flex justify-center">
        <div className="w-full max-w-md bg-white px-4 pt-2 pb-4 shadow-sm">
          {items.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={() => handleItemClick(item)}
              className="flex items-center gap-[14px] py-4 border-b border-borderGray last:border-b-0 hover:bg-gray-50 transition-colors w-full text-left group"
            >
              <div
                className={`w-[42px] h-[42px] rounded-full ${item.bg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
              >
                <img
                  src={item.icon}
                  alt={`${item.title} Icon`}
                  className={item.iconSize}
                />
              </div>
              <div className="flex flex-col flex-1 gap-0.5">
                <h2 className="text-textDark text-sm font-medium">
                  {item.title}
                </h2>
                <p className="text-textLight text-xs">{item.desc}</p>
              </div>
              <img
                src={item.arrow}
                alt="Arrow Right"
                className="w-[18px] h-[18px] shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
              />
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export default RiwayatTransaksiPage
