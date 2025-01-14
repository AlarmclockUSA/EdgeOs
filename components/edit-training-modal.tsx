'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"

interface Training {
  id: string
  title: string
  description: string
  videoLink: string
  trainingDate: string
}

interface EditTrainingModalProps {
  isOpen: boolean
  onClose: () => void
  training: Training
  onSave: (updatedTraining: Training) => Promise<void>
}

export function EditTrainingModal({ isOpen, onClose, training, onSave }: EditTrainingModalProps) {
  const [editedTraining, setEditedTraining] = useState<Training>(training)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditedTraining(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSave(editedTraining)
      toast({
        title: "Training Updated",
        description: "The training information has been successfully updated.",
      })
      onClose()
    } catch (error) {
      console.error('Error updating training:', error)
      toast({
        title: "Error",
        description: "Failed to update the training. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Training</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white">Title</Label>
            <Input
              id="title"
              name="title"
              className="text-white bg-transparent"
              value={editedTraining.title}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">Description</Label>
            <Textarea
              id="description"
              name="description"
              className="text-white bg-transparent"
              value={editedTraining.description}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="videoLink" className="text-white">Video Link</Label>
            <Input
              id="videoLink"
              name="videoLink"
              className="text-white bg-transparent"
              value={editedTraining.videoLink}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trainingDate" className="text-white">Training Date</Label>
            <Input
              id="trainingDate"
              name="trainingDate"
              type="date"
              className="text-white bg-transparent"
              value={editedTraining.trainingDate.split('T')[0]}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

