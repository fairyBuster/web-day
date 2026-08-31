import { useEffect, useState } from 'react'
import { fetchImageWithCache } from '../utils/imageCache'

// <img> yang mengambil gambar media dari backend via fetch → blob → objectURL,
// sehingga bisa membawa Authorization header (pola ampli-frontend).
// Kalau fetch gagal, fallback ke src asli (diload browser langsung).
export default function ApiImage({
  src,
  alt = '',
  className = '',
  fallbackSrc = '',
  ...rest
}) {
  const [resolved, setResolved] = useState(null) // null = loading

  useEffect(() => {
    let active = true
    setResolved(null)
    if (!src) {
      setResolved(fallbackSrc || '')
      return
    }
    fetchImageWithCache(src).then((res) => {
      if (!active) return
      if (res.error) setResolved(fallbackSrc || src)
      else setResolved(res.objectUrl)
    })
    return () => {
      active = false
    }
  }, [src, fallbackSrc])

  if (resolved === null) {
    // Placeholder agar layout tidak melompat saat gambar dimuat
    return <div className={`${className} bg-imageBg`} aria-hidden="true" />
  }
  if (resolved === '') return null
  return <img src={resolved} alt={alt} className={className} {...rest} />
}
