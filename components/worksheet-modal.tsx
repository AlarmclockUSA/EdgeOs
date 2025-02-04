'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ClipboardCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { doc, setDoc, getDoc, collection } from 'firebase/firestore'
import { toast } from '@/components/ui/use-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface WorksheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  worksheetId: string;
  onSubmit: (newBoldActionId: string) => void;
}

export function WorksheetModal({ isOpen, onClose, worksheetId, onSubmit }: WorksheetModalProps) {
  const { user } = useAuth()
  const [worksheetData, setWorksheetData] = useState({
    insights: ['', '', ''],
    bigIdea: '',
    boldAction: '',
    futureIdeas: ['', '', '']
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [timeframe, setTimeframe] = useState<string>('1 Week')
  const [trainingTitle, setTrainingTitle] = useState('')

  // Reset function to clear all form data
  const resetForm = () => {
    setWorksheetData({
      insights: ['', '', ''],
      bigIdea: '',
      boldAction: '',
      futureIdeas: ['', '', '']
    })
    setTimeframe('1 Week')
    setIsSubmitted(false)
    setTrainingTitle('')
  }

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

  // Reset when worksheetId changes
  useEffect(() => {
    resetForm()
  }, [worksheetId])

  useEffect(() => {
    const fetchWorksheetData = async () => {
      if (user && worksheetId && isOpen) {  // Only fetch if modal is open
        try {
          const worksheetRef = doc(db, `users/${user.uid}/worksheets`, worksheetId)
          const worksheetDoc = await getDoc(worksheetRef)
          
          if (worksheetDoc.exists()) {
            const data = worksheetDoc.data()
            // Only load data if this worksheet was completed
            if (data.completed) {
              setWorksheetData({
                insights: data.insights || ['', '', ''],
                bigIdea: data.bigIdea || '',
                boldAction: data.boldAction || '',
                futureIdeas: data.futureIdeas || ['', '', '']
              })
              setTimeframe(data.timeframe || '1 Week')
              setIsSubmitted(true)
              
              // Fetch the training title from Tribe API instead of local collection
              if (data.trainingId) {
                setTrainingTitle(`Training ${data.trainingId}`)
              }
            }
          }
        } catch (error) {
          console.error('Error fetching worksheet data:', error)
          toast({
            title: "Error",
            description: "Failed to load worksheet data. Please try again.",
            variant: "destructive",
          })
        }
      }
    }
    fetchWorksheetData()
  }, [user, worksheetId, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (!user || !worksheetId) {
        throw new Error('User or worksheet ID is missing')
      }

      // Save worksheet data to user's subcollection
      const worksheetRef = doc(db, `users/${user.uid}/worksheets`, worksheetId)
      await setDoc(worksheetRef, {
        ...worksheetData,
        timeframe,
        completedAt: new Date(),
        userId: user.uid,
        completed: true,
        trainingId: worksheetId // Store the training ID for reference
      }, { merge: true })

      // Only create a new bold action if this is the first submission
      if (!isSubmitted) {
        // Create bold action
        const boldActionRef = doc(collection(db, `users/${user.uid}/boldActions`))
        await setDoc(boldActionRef, {
          action: worksheetData.boldAction,
          timeframe: timeframe,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          worksheetId: worksheetRef.id
        })

        // Update user progress in progress subcollection
        const now = new Date();
        console.log('Setting worksheet completion timestamp:', {
          worksheetId,
          timestamp: now,
          timestampType: now.constructor.name
        });
        
        const progressRef = doc(db, `users/${user.uid}/progress/trainings`)
        await setDoc(progressRef, {
          [worksheetId]: {
            worksheetCompleted: true,
            lastUpdated: now
          }
        }, { merge: true })

        onSubmit(boldActionRef.id)
      } else {
        toast({
          title: "Worksheet Updated",
          description: "Your changes have been saved.",
        })
      }

      onClose()
    } catch (error) {
      handleFirestoreError(error, 'Error submitting worksheet:')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFirestoreError = (error: any, message: string) => {
    console.error(message, error)
    toast({
      title: "Error",
      description: "Failed to submit worksheet. Please try again.",
      variant: "destructive",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 bg-background">
        <ScrollArea className="h-full max-h-[90vh] p-6 bg-white text-black">
          <DialogHeader>
            <DialogTitle className="text-2xl mb-4 text-black">{trainingTitle || 'Worksheet'}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center space-x-2 text-sm mb-4">
            <ClipboardCheck className={isSubmitted ? 'text-green-500' : 'text-red-500'} />
            <span className={isSubmitted 
              ? 'text-green-500' 
              : 'bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold'}>
              {isSubmitted ? 'Completed - You can still make changes' : 'Not submitted yet'}
            </span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="p-4 bg-white text-black">
              <h3 className="text-lg font-semibold mb-4 text-black">What are your top 3 insights?</h3>
              <div className="space-y-4">
                {worksheetData.insights.map((insight, index) => (
                  <Textarea
                    key={`insight-${index}`}
                    value={insight}
                    onChange={(e) => {
                      const newInsights = [...worksheetData.insights]
                      newInsights[index] = e.target.value
                      setWorksheetData({ ...worksheetData, insights: newInsights })
                    }}
                    placeholder={`Insight ${index + 1}`}
                    className="bg-white text-black"
                  />
                ))}
              </div>
            </Card>

            <Card className="p-4 bg-white text-black">
              <h3 className="text-lg font-semibold mb-4 text-black">
                What was the one big idea that stood out to you?
              </h3>
              <Textarea
                value={worksheetData.bigIdea}
                onChange={(e) => setWorksheetData({ ...worksheetData, bigIdea: e.target.value })}
                placeholder="Your big idea..."
                className="bg-white text-black"
              />
            </Card>

            <Card className="p-4 bg-white text-black">
              <h3 className="text-lg font-semibold mb-4 text-black">
                Expected Timeframe
              </h3>
              <div className="space-y-2">
                <Label htmlFor="timeframe">Expected Timeframe</Label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger id="timeframe" className="bg-white text-black">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-black">
                    <SelectItem value="1 Week">1 Week</SelectItem>
                    <SelectItem value="2 Weeks">2 Weeks</SelectItem>
                    <SelectItem value="3 Weeks">3 Weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <h3 className="text-lg font-semibold mb-4 text-black">
                What bold action can you take this week?
              </h3>
              <Textarea
                value={worksheetData.boldAction}
                onChange={(e) => setWorksheetData({ ...worksheetData, boldAction: e.target.value })}
                placeholder="Your bold action..."
                className="bg-white text-black"
              />
            </Card>

            <Card className="p-4 bg-white text-black">
              <h3 className="text-lg font-semibold mb-4 text-black">
                What ideas would you like to follow up on in the future?
              </h3>
              <div className="space-y-4">
                {worksheetData.futureIdeas.map((idea, index) => (
                  <Textarea
                    key={`future-${index}`}
                    value={idea}
                    onChange={(e) => {
                      const newIdeas = [...worksheetData.futureIdeas]
                      newIdeas[index] = e.target.value
                      setWorksheetData({ ...worksheetData, futureIdeas: newIdeas })
                    }}
                    placeholder={`Future idea ${index + 1}`}
                    className="bg-white text-black"
                  />
                ))}
              </div>
            </Card>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : isSubmitted ? 'Update Worksheet' : 'Submit Worksheet'}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

