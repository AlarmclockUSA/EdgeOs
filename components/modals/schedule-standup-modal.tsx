'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addDoc, collection, serverTimestamp, doc, Timestamp } from 'firebase/firestore'
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
    if (!date || !time || !user) return
    
    setIsSubmitting(true)
    try {
      const scheduledFor = new Date(`${date}T${time}`)
      
      // Create standup document in supervisor's collection
      const standupData = {
        scheduledFor: Timestamp.fromDate(scheduledFor),
        status: 'scheduled',
        teamMemberName: `${teamMember.firstName} ${teamMember.lastName}`,
        teamMemberId: teamMember.id,
        supervisorId: user.uid,
        supervisorName: user.displayName || 'Unknown Supervisor',
        meetingLink: `https://meet.google.com/${Math.random().toString(36).substring(7)}`
      }
      
      // Add to supervisor's collection
      await addDoc(collection(db, `users/${user.uid}/standups`), standupData)
      
      // Add to team member's collection
      await addDoc(collection(db, `users/${teamMember.id}/standups`), standupData)

      toast({
        title: "Success",
        description: "Standup scheduled successfully",
      })
      
      // Refresh standups list if the function exists
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