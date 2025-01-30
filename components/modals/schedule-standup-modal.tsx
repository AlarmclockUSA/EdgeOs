'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addDoc, collection, serverTimestamp, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { toast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'

interface ScheduleStandupModalProps {
  isOpen: boolean
  onClose: () => void
  teamMember: {
    id: string
    firstName: string
    lastName: string
  }
}

export function ScheduleStandupModal({ isOpen, onClose, teamMember }: ScheduleStandupModalProps) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()

  const handleSubmit = async () => {
    if (!date || !time || !user?.uid) return

    setIsSubmitting(true)
    try {
      const datetime = new Date(`${date}T${time}`)
      
      // Create standup in team member's subcollection
      const teamMemberDoc = doc(db, 'users', teamMember.id)
      const teamMemberStandupsCollection = collection(teamMemberDoc, 'standups')
      
      // Create standup in supervisor's subcollection
      const supervisorDoc = doc(db, 'users', user.uid)
      const supervisorStandupsCollection = collection(supervisorDoc, 'standups')
      
      // Create the standup data
      const standupData = {
        supervisorId: user.uid,
        teamMemberId: teamMember.id,
        scheduledFor: datetime,
        status: 'scheduled',
        createdAt: serverTimestamp(),
        teamMemberName: `${teamMember.firstName} ${teamMember.lastName}` // Add team member name for supervisor's view
      }
      
      // Write to both collections
      await Promise.all([
        addDoc(teamMemberStandupsCollection, standupData),
        addDoc(supervisorStandupsCollection, standupData)
      ])

      toast({
        title: "Success",
        description: `Standup scheduled with ${teamMember.firstName} for ${date} at ${time}`,
      })

      // Trigger refresh of all UpcomingStandups components
      if (window.refreshStandups) {
        window.refreshStandups()
      }

      onClose()
    } catch (error) {
      console.error('Error scheduling standup:', error)
      toast({
        title: "Error",
        description: "Failed to schedule standup. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-[#333333]">
            Schedule Standup with {teamMember.firstName} {teamMember.lastName}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="date" className="text-[#333333]">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-white text-[#333333] border-gray-200"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="time" className="text-[#333333]">Time</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-white text-[#333333] border-gray-200"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-white text-[#333333] border-gray-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!date || !time || isSubmitting}
            className="bg-[#3E5E17] text-white hover:bg-[#527A1F]"
          >
            Schedule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 