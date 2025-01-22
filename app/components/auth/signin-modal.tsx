'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface SignInModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const router = useRouter()

  const handleCreateCompany = () => {
    router.push('/company-setup')
    onClose()
  }

  const handleJoinCompany = () => {
    router.push('/join-company')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Welcome to Brilliant OS</DialogTitle>
          <DialogDescription>
            Choose how you would like to connect to a Brilliant OS company.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4 pt-4">
          <Button 
            onClick={handleCreateCompany}
            className="w-full"
          >
            Create New Brilliant OS Company
          </Button>
          <Button 
            onClick={handleJoinCompany}
            variant="outline"
            className="w-full"
          >
            Join Existing Brilliant OS Company
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 