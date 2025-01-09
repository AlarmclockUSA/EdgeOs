'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'

interface ThemeContextType {
  themeColor: string
}

const ThemeContext = createContext<ThemeContextType>({ themeColor: '#6366f1' })

export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeColor, setThemeColor] = useState('#6366f1')
  const { companyName } = useAuth()

  useEffect(() => {
    if (companyName) {
      const unsubscribe = onSnapshot(doc(db, 'companies', companyName), (doc) => {
        if (doc.exists()) {
          setThemeColor(doc.data().themeColor || '#6366f1')
        }
      })
      return () => unsubscribe()
    }
  }, [companyName])

  useEffect(() => {
    document.documentElement.style.setProperty('--theme-primary', themeColor)
  }, [themeColor])

  return (
    <ThemeContext.Provider value={{ themeColor }}>
      {children}
    </ThemeContext.Provider>
  )
}

