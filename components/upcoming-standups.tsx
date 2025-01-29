'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, orderBy, Timestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { format, startOfDay, isSameDay, isAfter } from 'date-fns'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Check, Video } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Declare global refreshStandups function
declare global {
  interface Window {
    refreshStandups?: () => void
  }
}

interface Standup {
  id: string
  scheduledFor: Date
  status: string
  teamMemberName: string
  supervisorId: string
  teamMemberId: string
  meetingLink?: string
}

export function UpcomingStandups() {
  const [standups, setStandups] = useState<Standup[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)
  const [selectedStandup, setSelectedStandup] = useState<Standup | null>(null)
  const [notes, setNotes] = useState('')
  const { user, userRole, loading: authLoading } = useAuth()
  const [refreshKey, setRefreshKey] = useState(0)

  const refreshStandups = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleComplete = async () => {
    if (!user?.uid || !selectedStandup) return

    try {
      setCompleting(selectedStandup.id)
      
      // Update standup status
      const standupRef = doc(db, `users/${user.uid}/standups/${selectedStandup.id}`)
      const completedAt = Timestamp.now()
      await updateDoc(standupRef, {
        status: 'completed',
        completedAt
      })

      // Update user's meeting notes using arrayUnion
      const userRef = doc(db, 'users', selectedStandup.teamMemberId)
      await updateDoc(userRef, {
        standupNotes: arrayUnion({
          notes,
          date: completedAt,
          supervisorId: user.uid,
          supervisorName: user.displayName || 'Unknown Supervisor'
        })
      })
      
      // Update local state
      setStandups(prev => prev.filter(s => s.id !== selectedStandup.id))
      setSelectedStandup(null)
      setNotes('')
      toast.success('Standup completed successfully')
    } catch (error) {
      console.error('Error completing standup:', error)
      toast.error('Failed to complete standup')
    } finally {
      setCompleting(null)
    }
  }

  const startMeeting = (meetingLink?: string) => {
    if (!meetingLink) {
      toast.error('No meeting link available')
      return
    }
    window.open(meetingLink, '_blank')
  }

  useEffect(() => {
    const fetchStandups = async () => {
      // Wait for auth to be ready and user to be available
      if (authLoading || !user?.uid || !userRole) {
        console.log('Waiting for auth...', { authLoading, userId: user?.uid, userRole })
        return
      }
      
      try {
        console.log('Fetching standups for user:', user.uid, 'with role:', userRole)
        
        // For regular users, only fetch their own standups
        // For supervisors and executives, they can see all standups
        const standupsRef = collection(db, `users/${user.uid}/standups`)
        
        // Build query based on role
        const baseQuery = query(
          standupsRef,
          where('status', '==', 'scheduled'),
          orderBy('scheduledFor', 'asc')
        )
        
        const snapshot = await getDocs(baseQuery)
        console.log('Found standups:', snapshot.size)
        
        const now = new Date()
        const today = startOfDay(now)
        
        const upcomingStandups = snapshot.docs
          .map(doc => {
            const data = doc.data()
            console.log('Raw standup data:', data)
            
            // Handle Firestore Timestamp
            let scheduledFor: Date | null = null
            if (data.scheduledFor && typeof data.scheduledFor === 'object' && 'seconds' in data.scheduledFor) {
              scheduledFor = new Date(data.scheduledFor.seconds * 1000)
            }
            
            if (!scheduledFor) {
              console.error('Invalid scheduledFor date:', data.scheduledFor)
              return null
            }
            
            console.log('Parsed scheduledFor:', scheduledFor)
            
            return {
              id: doc.id,
              scheduledFor,
              status: data.status,
              teamMemberName: data.teamMemberName,
              supervisorId: data.supervisorId,
              teamMemberId: data.teamMemberId,
              meetingLink: data.meetingLink
            }
          })
          .filter((standup): standup is Standup => {
            if (!standup) {
              return false
            }
            // Show standups that are either:
            // 1. Scheduled for today (regardless of time)
            // 2. Scheduled for future days
            const isToday = isSameDay(standup.scheduledFor, now)
            const isFutureDay = isAfter(standup.scheduledFor, today)
            const shouldShow = isToday || isFutureDay
            
            console.log('Standup date check:', {
              id: standup.id,
              scheduledFor: standup.scheduledFor,
              now,
              isToday,
              isFutureDay,
              shouldShow
            })
            
            return shouldShow
          })
          .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())
        
        console.log('Final processed standups:', upcomingStandups)
        setStandups(upcomingStandups)
      } catch (error) {
        console.error('Error fetching standups:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStandups()
  }, [user?.uid, userRole, authLoading, refreshKey])

  useEffect(() => {
    window.refreshStandups = refreshStandups
    return () => {
      delete window.refreshStandups
    }
  }, [])

  if (authLoading || loading) {
    return <div className="text-center py-4">Loading...</div>
  }

  return (
    <>
      <ScrollArea className="h-[300px]">
        <div className="space-y-4">
          {standups.length > 0 ? (
            standups.map((standup) => (
              <div
                key={standup.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
              >
                <div>
                  <p className="font-medium text-[#333333]">
                    {standup.teamMemberName}
                  </p>
                  <p className="text-sm text-[#666666]">
                    {format(standup.scheduledFor, 'MMM d, yyyy')} at {format(standup.scheduledFor, 'h:mm a')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startMeeting(standup.meetingLink)}
                    disabled={!standup.meetingLink}
                    className="bg-[#0056D2] text-white hover:bg-[#EAF4FE] hover:text-[#0056D2]"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Start Meeting
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStandup(standup)}
                    disabled={completing === standup.id}
                    className="bg-[#0056D2] text-white hover:bg-[#EAF4FE] hover:text-[#0056D2]"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Complete
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No upcoming standups scheduled</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <Dialog open={!!selectedStandup} onOpenChange={(open) => !open && setSelectedStandup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Standup with {selectedStandup?.teamMemberName}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter meeting notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[150px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedStandup(null)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={completing === selectedStandup?.id || !notes.trim()}
              className="bg-[#0056D2] text-white hover:bg-[#0056D2]/90"
            >
              {completing === selectedStandup?.id ? 'Completing...' : 'Complete Standup'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 