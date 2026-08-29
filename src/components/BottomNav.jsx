import rumahIcon from '../assets/8_718.svg'
import proyekIcon from '../assets/8_724.svg'
import timIcon from '../assets/8_730.svg'
import akuIcon from '../assets/8_738.svg'

const defaultIcons = {
  home: rumahIcon,
  proyek: proyekIcon,
  tim: timIcon,
  aku: akuIcon,
}

const navItems = [
  { key: 'home', label: 'Rumah' },
  { key: 'proyek', label: 'Proyek' },
  { key: 'tim', label: 'Tim' },
  { key: 'aku', label: 'Aku' },
]

function BottomNav({ active = 'home', onNavigate, icons = defaultIcons }) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-borderGray flex justify-between items-center px-2 py-2 z-50">
      {navItems.map((item) => {
        const isActive = active === item.key
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onNavigate?.(item.key)}
            className="flex flex-col items-center justify-center w-[90px] gap-1"
          >
            <img
              src={icons[item.key]}
              alt={item.label}
              className="w-[22px] h-[22px]"
            />
            <span
              className={`text-[11px] ${
                isActive ? 'text-primary font-medium' : 'text-textLight'
              }`}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav
