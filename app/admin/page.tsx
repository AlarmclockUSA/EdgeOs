'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { toast } from '@/components/ui/use-toast'

export default function AdminDashboard() {
  const { userRole } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (userRole !== 'executive' && userRole !== 'supervisor') {
      toast({
        title: "Access Denied",
        description: "You do not have permission to view this page.",
        variant: "destructive",
      })
      router.push('/')
    }
  }, [userRole, router])

  if (userRole !== 'executive' && userRole !== 'supervisor') {
    return null
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Manage Trainings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">View, add, edit, or delete training sessions.</p>
            <Button asChild>
              <Link href="/admin/trainings">View Trainings</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Add New Training</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Create a new training session for your team.</p>
            <Button asChild>
              <Link href="/admin/add-training">Add Training</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

