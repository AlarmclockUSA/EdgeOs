'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export function useOnboarding() {
  const { user, userRole } = useAuth()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user || !userRole) return

      try {
        const checklistRef = doc(db, `users/${user.uid}/onboarding/checklist`)
        const checklistDoc = await getDoc(checklistRef)
        
        if (!checklistDoc.exists()) {
          // If no checklist exists, show onboarding
          setShowOnboarding(true)
        } else {
          const checklist = checklistDoc.data()
          const allCompleted = Object.values(checklist).every(item => item === true)
          setShowOnboarding(!allCompleted)
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error)
      } finally {
        setLoading(false)
      }
    }

    checkOnboardingStatus()
  }, [user, userRole])

  return {
    showOnboarding,
    setShowOnboarding,
    loading
  }
} 
