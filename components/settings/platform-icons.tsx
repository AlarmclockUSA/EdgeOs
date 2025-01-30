'use client'

import Image from 'next/image'

interface PlatformIconProps {
  platform: 'zoom' | 'teams' | 'meet' | 'other'
  className?: string
}

export function PlatformIcon({ platform, className = "h-4 w-4" }: PlatformIconProps) {
  const iconSrc = {
    zoom: '/Zoom_Logo.svg.png',
    teams: '/Microsoft_Office_Teams_(2018–present).svg.png',
    meet: '/Google_Meet_text_logo_dark_(2017-2020).svg.png',
    other: '/placeholder-logo.png'
  }

  return (
    <div className={className}>
      <Image
        src={iconSrc[platform]}
        alt={`${platform} icon`}
        width={24}
        height={24}
        className="w-full h-full object-contain"
      />
    </div>
  )
} 