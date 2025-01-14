'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { addDoc, collection, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'

export default function AddTraining() {
  const [videoLink, setVideoLink] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { user, userRole, companyName } = useAuth()

  useEffect(() => {
    if (userRole !== 'executive' || companyName !== 'Brilliant Perspectives') {
      toast({
        title: "Access Denied",
        description: "You do not have permission to add trainings.",
        variant: "destructive",
      })
      router.push('/')
    }
  }, [userRole, companyName, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (userRole !== 'executive' || companyName !== 'Brilliant Perspectives') {
      toast({
        title: "Access Denied",
        description: "You do not have permission to add trainings.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await addDoc(collection(db, 'trainings'), {
        videoLink,
        title,
        description,
        createdAt: new Date(),
        createdBy: user?.uid,
        companyName: 'Brilliant Perspectives',
      })

      toast({
        title: "Training Added",
        description: "The new training has been successfully added.",
      })
      router.push('/admin/trainings')
    } catch (error) {
      console.error('Error adding training:', error)
      toast({
        title: "Error",
        description: "Failed to add the training. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Training</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="videoLink">Video Link</Label>
              <Input
                id="videoLink"
                type="url"
                value={videoLink}
                onChange={(e) => setVideoLink(e.target.value)}
                required
                placeholder="https://example.com/video"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Enter training title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Enter training description"
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Training'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

