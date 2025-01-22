'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from '@/lib/auth-context'
import { toast } from "@/components/ui/use-toast"

export default function ExecutiveDashboard() {
  const { userRole } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (userRole !== 'executive') {
      toast({
        title: "Access Denied",
        description: "You do not have permission to view this page.",
        variant: "destructive",
      })
      router.push('/')
      return
    }
  }, [userRole, router])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Executive Dashboard</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Supervisor Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {/* We'll rebuild the supervisor list here */}
        </CardContent>
      </Card>
    </div>
  )
}

