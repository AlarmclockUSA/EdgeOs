'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function TrainingStartDateSetter() {
  const [startDate, setStartDate] = useState('')
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const handleSetStartDate = async () => {
    try {
      const response = await fetch('/api/trainings/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ startDate }),
      })

      if (!response.ok) {
        throw new Error('Failed to reorder trainings')
      }

      toast({
        title: "Trainings Reordered",
        description: "The trainings have been successfully reordered.",
      })
    } catch (error) {
      console.error('Error reordering trainings:', error)
      toast({
        title: "Error",
        description: "Failed to reorder trainings. Please try again.",
        variant: "destructive",
      })
    }
    setIsConfirmOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="startDate">Training Start Date</Label>
        <Input
          id="startDate"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <Button onClick={() => setIsConfirmOpen(true)}>Set Start Date</Button>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will reorder all trainings to be 7 days apart, starting from the selected date. 
              Trainings will be sorted by title in ascending order. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSetStartDate}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

