'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/components/ui/use-toast'
import Link from 'next/link'
import { EditTrainingModal } from '@/components/edit-training-modal'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface Training {
  id: string
  title: string
  description: string
  trainingDate: string
  createdAt: string
}

type SortField = 'title' | 'trainingDate' | 'createdAt'
type SortOrder = 'asc' | 'desc'

export default function Trainings() {
  const [trainings, setTrainings] = useState<Training[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingTraining, setEditingTraining] = useState<Training | null>(null)
  const [sortField, setSortField] = useState<SortField>('trainingDate')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const router = useRouter()
  const { user, userRole, companyName } = useAuth()

  useEffect(() => {
    if (userRole !== 'executive' && userRole !== 'supervisor') {
      toast({
        title: "Access Denied",
        description: "You do not have permission to view this page.",
        variant: "destructive",
      })
      router.push('/')
      return
    }

    if (companyName !== "Brilliant Perspectives") {
      toast({
        title: "Access Denied",
        description: "This page is only accessible to Brilliant Perspectives administrators.",
        variant: "destructive",
      })
      router.push('/')
      return
    }

    fetchTrainings()
  }, [userRole, router, companyName])

  const fetchTrainings = async () => {
    try {
      const response = await fetch('/api/trainings')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`HTTP error! status: ${response.status}, body: ${JSON.stringify(errorData)}`)
      }
      const data = await response.json()
      if (!data || !Array.isArray(data.trainings)) {
        throw new Error('Invalid data structure received from API')
      }
      setTrainings(data.trainings)
    } catch (error) {
      console.error('Error fetching trainings:', error)
      setError(error instanceof Error ? error.message : String(error))
      toast({
        title: "Error",
        description: `Failed to fetch trainings: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditTraining = async (updatedTraining: Training) => {
    try {
      const response = await fetch(`/api/trainings/${updatedTraining.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTraining),
      })

      if (!response.ok) {
        throw new Error('Failed to update training')
      }

      setTrainings(prevTrainings =>
        prevTrainings.map(training =>
          training.id === updatedTraining.id ? updatedTraining : training
        )
      )
    } catch (error) {
      console.error('Error updating training:', error)
      toast({
        title: "Error",
        description: "Failed to update the training. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const sortedTrainings = [...trainings].sort((a, b) => {
    if (sortField === 'title') {
      return sortOrder === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
    } else if (sortField === 'trainingDate' || sortField === 'createdAt') {
      const dateA = new Date(a[sortField]).getTime()
      const dateB = new Date(b[sortField]).getTime()
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
    }
    return 0
  })

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <p>This could be due to a database connection issue or the trainings collection not existing yet.</p>
            <Button onClick={() => { setLoading(true); fetchTrainings(); }} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Trainings</CardTitle>
          <Button asChild>
            <Link href="/admin/add-training">Add New Training</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {sortedTrainings.length === 0 ? (
            <p>No trainings found. You can add a new training using the button above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort('title')} className="cursor-pointer">
                    Title
                    {sortField === 'title' && (sortOrder === 'asc' ? <ChevronUp className="inline ml-1" /> : <ChevronDown className="inline ml-1" />)}
                  </TableHead>
                  <TableHead onClick={() => handleSort('trainingDate')} className="cursor-pointer">
                    Training Date
                    {sortField === 'trainingDate' && (sortOrder === 'asc' ? <ChevronUp className="inline ml-1" /> : <ChevronDown className="inline ml-1" />)}
                  </TableHead>
                  <TableHead onClick={() => handleSort('createdAt')} className="cursor-pointer">
                    Created At
                    {sortField === 'createdAt' && (sortOrder === 'asc' ? <ChevronUp className="inline ml-1" /> : <ChevronDown className="inline ml-1" />)}
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTrainings.map((training) => (
                  <TableRow key={training.id}>
                    <TableCell>{training.title}</TableCell>
                    <TableCell>{new Date(training.trainingDate).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(training.createdAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTraining(training)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {editingTraining && (
        <EditTrainingModal
          isOpen={!!editingTraining}
          onClose={() => setEditingTraining(null)}
          training={editingTraining}
          onSave={handleEditTraining}
        />
      )}
    </div>
  )
}

