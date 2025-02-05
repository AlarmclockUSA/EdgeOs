'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useAuth } from '@/lib/auth-context'
import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { ArrowRight, ArrowLeft, Layout, Users, BookOpen, Settings } from 'lucide-react'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
}

interface OnboardingStep {
  title: string
  description: string
  content: string[]
  icon?: React.ElementType
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { userRole } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)

  const executiveSteps: OnboardingStep[] = [
    {
      title: "Platform Overview",
      description: "Let's get familiar with LeaderForge's key features",
      icon: Layout,
      content: [
        "Executive Dashboard: View company-wide progress and team performance metrics",
        "Learning Library: Access all training content and track completion",
        "My Team: Monitor your direct reports and schedule standups",
        "Company Settings: Manage team members and company configuration",
        "Note: You can reopen this guide anytime from the Help icon in the sidebar"
      ]
    },
    {
      title: "Invite Your Team",
      description: "Build your leadership team",
      icon: Users,
      content: [
        "Click 'Company Settings' in the left sidebar",
        "Find your supervisor and team member invite links",
        "Share the links with your team to get them started"
      ]
    },
    {
      title: "Begin Your Journey",
      description: "Start with your first training session",
      icon: BookOpen,
      content: [
        "Click 'Learning Library' in the left sidebar",
        "Complete both the video and worksheet to track your progress",
        "Schedule standups with your team to implement what you've learned"
      ]
    }
  ]

  const supervisorSteps: OnboardingStep[] = [
    {
      title: "Platform Overview",
      description: "Let's get familiar with LeaderForge's key features",
      icon: Layout,
      content: [
        "My Team: View your team's progress and schedule standups",
        "Learning Library: Access all training content and track completion",
        "Bold Actions: Track implementation of your learning",
        "Account Settings: Configure your profile and meeting settings",
        "Note: You can reopen this guide anytime from the Help icon in the sidebar"
      ]
    },
    {
      title: "Team Setup",
      description: "Get your team onboarded",
      icon: Users,
      content: [
        "Check your email for your supervisor invite link",
        "Click 'My Team' to view your team dashboard",
        "Share your team member invite links to get everyone started",
        "Schedule initial standups with each team member"
      ]
    },
    {
      title: "Begin Your Journey",
      description: "Start with your first training session",
      icon: BookOpen,
      content: [
        "Click 'Learning Library' in the left sidebar",
        "Complete both the video and worksheet to track your progress",
        "Use your learnings in your next team standup"
      ]
    }
  ]

  const steps = userRole === 'executive' ? executiveSteps : supervisorSteps
  const currentStepData = steps[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onClose()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 bg-gradient-to-b from-background to-muted/30">
        <div className="p-6 pb-4 bg-gradient-to-b from-[#F5A524] to-[#F5A524]/80">
          <DialogHeader>
            <div className="flex items-center gap-4">
              {currentStepData.icon && (
                <div className="p-2 bg-white/10 rounded-lg">
                  <currentStepData.icon className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <DialogTitle className="text-2xl text-white">{currentStepData.title}</DialogTitle>
                <p className="text-white/80 mt-1">{currentStepData.description}</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-4">
          <div className="space-y-4">
            {currentStepData.content.map((item, index) => (
              <div key={index} className="flex items-start gap-3 animate-fadeIn" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="min-w-[24px] h-6 flex items-center justify-center rounded-full bg-[#F5A524]/10 text-[#F5A524] font-medium text-sm mt-0.5">
                  {index + 1}
                </div>
                <p className="text-foreground/90 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t">
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstStep}
              className="hover:bg-[#F5A524]/10 hover:text-[#F5A524] hover:border-[#F5A524]/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <Button 
              onClick={handleNext}
              className="bg-[#F5A524] hover:bg-[#F5A524]/90 text-white"
            >
              {isLastStep ? 'Get Started' : 'Next'}
              {!isLastStep && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}