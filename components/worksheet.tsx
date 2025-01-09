'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { updateWorksheetProgress, getWorksheetProgress, updateUserOverallProgress } from '@/lib/progress-tracking'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface WorksheetProps {
  worksheetId: string
  title: string
  questions: { id: string; text: string }[]
}

export function Worksheet({ worksheetId, title, questions }: WorksheetProps) {
  const { user } = useAuth()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isCompleted, setIsCompleted] = useState(false)

  useEffect(() => {
    const fetchProgress = async () => {
      if (user) {
        const progress = await getWorksheetProgress(user.uid, worksheetId)
        if (progress) {
          setAnswers(progress.answers || {})
          setIsCompleted(progress.isCompleted)
        }
      }
    }
    fetchProgress()
  }, [user, worksheetId])

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async () => {
    if (user) {
      const allAnswered = questions.every(q => answers[q.id])
      await updateWorksheetProgress(user.uid, {
        worksheetId,
        isCompleted: allAnswered,
        answers
      })
      await updateUserOverallProgress(user.uid, 'worksheet', allAnswered)
      setIsCompleted(allAnswered)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {questions.map(question => (
          <div key={question.id} className="mb-4">
            <p className="mb-2">{question.text}</p>
            <Input
              value={answers[question.id] || ''}
              onChange={e => handleAnswerChange(question.id, e.target.value)}
              disabled={isCompleted}
            />
          </div>
        ))}
        <Button onClick={handleSubmit} disabled={isCompleted}>
          {isCompleted ? 'Completed' : 'Submit'}
        </Button>
      </CardContent>
    </Card>
  )
}

