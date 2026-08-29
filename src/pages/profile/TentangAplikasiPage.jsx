import { useState } from 'react'
import logoImg from '../../assets/6599a1a542c3a2fd08343a2ebac01e9ee2c2e144.png'
import backIcon from '../../assets/29_704.svg'
import tncIcon from '../../assets/29_721.svg'
import tncArrow from '../../assets/29_726.svg'
import privacyIcon from '../../assets/29_730.svg'
import privacyArrow from '../../assets/29_734.svg'
import licenseIcon from '../../assets/29_738.svg'
import licenseArrow from '../../assets/29_743.svg'
import updateIcon from '../../assets/29_747.svg'
import instagramIcon from '../../assets/29_761.svg'
import facebookIcon from '../../assets/29_766.svg'
import twitterIcon from '../../assets/29_769.svg'
import LisensiModal from '../../components/LisensiModal'

const links = [
  { label: 'Syarat & Ketentuan', icon: tncIcon, arrow: tncArrow, bg: 'bg-[#e0f3e1]', action: 'terms' },
  { label: 'Kebijakan Privasi', icon: privacyIcon, arrow: privacyArrow, bg: 'bg-[#dbe9fb]', action: 'terms' },
  { label: 'Lisensi', icon: licenseIcon, arrow: licenseArrow, bg: 'bg-[#fbeed4]', action: 'lisensi' },
  { label: 'Cek Pembaruan', icon: updateIcon, arrow: null, bg: 'bg-[#f3ddf0]', note: 'Versi terbaru' },
]

const socials = [
  { icon: instagramIcon, label: 'Instagram' },
  { icon: facebookIcon, label: 'Facebook' },
  { icon: twitterIcon, label: 'Twitter' },
]

function TentangAplikasiPage({ onBackClick, onTermsClick }) {
  const [showLisensi, setShowLisensi] = useState(false)

  const handleAction = (link) => {
    if (link.action === 'lisensi') setShowLisensi(true)
    else if (link.action === 'terms') onTermsClick?.()
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header Section */}
      <section className="bg-primary flex justify-center">
        <div className="w-full max-w-md relative flex items-center justify-center h-14 px-4 text-white shadow-sm">
          <button
            type="button"
            onClick={onBackClick}
            className="absolute left-4 flex items-center justify-center w-8 h-8 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Go back"
          >
            <img src={backIcon} alt="Back" className="w-[18px] h-[18px]" />
          </button>
          <h1 className="font-semibold text-base tracking-wide">Tentang Aplikasi</h1>
        </div>
      </section>

      {/* App Info Section */}
      <section className="bg-white flex justify-center">
        <div className="w-full max-w-md flex flex-col items-center px-6 pt-9 pb-6">
          <img
            src={logoImg}
            alt="Petro Oil and Gas Logo"
            className="w-[76px] h-[76px] mb-4 rounded-full shadow-sm object-cover"
          />
          <h2 className="text-textDark font-bold text-xl mb-1">Petro Oil and Gas</h2>
          <p className="text-textLight text-sm mb-6">Versi 2.4.1 (Build 118)</p>
          <p className="text-textGray text-center text-sm leading-relaxed">
            Platform digital yang dirancang untuk memberikan akses layanan, informasi, dan
            pengelolaan aktivitas pengguna secara praktis dalam satu aplikasi.
          </p>
        </div>
      </section>

      {/* Links Section */}
      <section className="bg-white flex justify-center">
        <div className="w-full max-w-md px-5 flex flex-col">
          {links.map((link) => {
            const content = (
              <>
                <div
                  className={`w-9 h-9 rounded-[10px] ${link.bg} flex items-center justify-center mr-4 shrink-0 group-hover:scale-105 transition-transform`}
                >
                  <img src={link.icon} alt={`${link.label} Icon`} className="w-[18px] h-[18px]" />
                </div>
                <span className="text-textDark text-sm flex-1 font-semibold">{link.label}</span>
                {link.arrow ? (
                  <img
                    src={link.arrow}
                    alt="Arrow Right"
                    className="w-[18px] h-[18px] opacity-40 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <span className="text-textLight text-xs">{link.note}</span>
                )}
              </>
            )
            return link.action ? (
              <button
                key={link.label}
                type="button"
                onClick={() => handleAction(link)}
                className="flex items-center py-4 border-b border-borderGray last:border-b-0 hover:bg-gray-50 transition-colors group w-full text-left"
              >
                {content}
              </button>
            ) : (
              <a
                key={link.label}
                href="#"
                className="flex items-center py-4 border-b border-borderGray last:border-b-0 hover:bg-gray-50 transition-colors group"
              >
                {content}
              </a>
            )
          })}
        </div>
      </section>

      {/* Company Info Section */}
      <section className="bg-white flex justify-center">
        <div className="w-full max-w-md px-5 py-6">
          <div className="bg-[#f7f8fa] rounded-[14px] px-5 py-5">
            <h3 className="text-textDark font-bold text-sm mb-3">Tentang Perusahaan</h3>
            <p className="text-[#6a6d72] text-xs leading-relaxed">
              Petro Oil and Gas merupakan perusahaan yang bergerak di sektor energi dengan fokus
              pada pengembangan dan pengelolaan kegiatan di bidang minyak dan gas. Dengan
              mengedepankan profesionalisme, efisiensi, dan pemanfaatan teknologi, perusahaan
              terus mengembangkan layanan yang lebih terintegrasi untuk mendukung kebutuhan
              operasional dan para pengguna.
              <br /><br />
              Melalui platform digital ini, Petro Oil and Gas menghadirkan akses informasi dan
              layanan dalam satu sistem yang lebih mudah digunakan, transparan, dan terstruktur.
            </p>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <section className="bg-white flex justify-center">
        <div className="w-full max-w-md flex flex-col items-center pt-10 pb-8">
          <div className="flex gap-4 mb-8">
            {socials.map((social) => (
              <a
                key={social.label}
                href="#"
                className="w-10 h-10 rounded-full bg-[#f2f3f5] flex items-center justify-center hover:bg-gray-200 transition-colors"
                aria-label={social.label}
              >
                <img src={social.icon} alt={social.label} className="w-[18px] h-[18px]" />
              </a>
            ))}
          </div>
          <p className="text-[#b0b4ba] text-xs">© 2026 POG. Seluruh hak cipta dilindungi.</p>
        </div>
      </section>

      {/* Lisensi Modal */}
      <LisensiModal open={showLisensi} onClose={() => setShowLisensi(false)} />
    </div>
  )
}

export default TentangAplikasiPage
