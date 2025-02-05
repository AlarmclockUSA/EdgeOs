'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from '@/lib/auth-context'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChecklistItem {
  id: string
  title: string
  completed: boolean
}

interface ChecklistSection {
  title: string
  items: ChecklistItem[]
}

export function OnboardingChecklist() {
  const { user, userRole } = useAuth()
  const [isOpen, setIsOpen] = useState(true)
  const [checklist, setChecklist] = useState<ChecklistSection[]>([])
  const [loading, setLoading] = useState(true)

  const executiveChecklist: ChecklistSection[] = [
    {
      title: "Platform Overview",
      items: [
        { id: "exec_dashboard", title: "Review Executive Dashboard", completed: false },
        { id: "exec_metrics", title: "Familiarize with key metrics", completed: false },
        { id: "exec_nav", title: "Explore navigation menu", completed: false }
      ]
    },
    {
      title: "Company Setup",
      items: [
        { id: "company_settings", title: "Configure company settings", completed: false },
        { id: "add_supervisors", title: "Add supervisors using invite system", completed: false },
        { id: "setup_departments", title: "Set up departments and team structures", completed: false }
      ]
    },
    {
      title: "Team Management",
      items: [
        { id: "assign_members", title: "Assign team members to supervisors", completed: false },
        { id: "setup_standups", title: "Set up stand-up meeting templates", completed: false },
        { id: "config_permissions", title: "Configure team permissions", completed: false }
      ]
    },
    {
      title: "Training & Development",
      items: [
        { id: "review_content", title: "Review available training content", completed: false },
        { id: "setup_actions", title: "Set up bold action tracking", completed: false },
        { id: "monitor_analytics", title: "Monitor team progress analytics", completed: false }
      ]
    }
  ]

  const supervisorChecklist: ChecklistSection[] = [
    {
      title: "Getting Started",
      items: [
        { id: "super_dashboard", title: "Review team dashboard", completed: false },
        { id: "send_invites", title: "Send team member invites", completed: false },
        { id: "setup_profile", title: "Set up your profile", completed: false }
      ]
    },
    {
      title: "Stand-up Management",
      items: [
        { id: "schedule_standups", title: "Schedule recurring stand-ups", completed: false },
        { id: "config_templates", title: "Configure meeting templates", completed: false },
        { id: "setup_meetings", title: "Set up video meeting links", completed: false }
      ]
    },
    {
      title: "Training Management",
      items: [
        { id: "review_materials", title: "Review team training materials", completed: false },
        { id: "track_actions", title: "Track bold actions progress", completed: false },
        { id: "monitor_performance", title: "Monitor team performance", completed: false }
      ]
    }
  ]

  useEffect(() => {
    const loadChecklist = async () => {
      if (!user) return

      try {
        const checklistRef = doc(db, `users/${user.uid}/onboarding/checklist`)
        const checklistDoc = await getDoc(checklistRef)
        
        if (checklistDoc.exists()) {
          const savedChecklist = checklistDoc.data()
          const baseChecklist = userRole === 'executive' ? executiveChecklist : supervisorChecklist
          
          // Merge saved state with base checklist
          const mergedChecklist = baseChecklist.map(section => ({
            ...section,
            items: section.items.map(item => ({
              ...item,
              completed: savedChecklist[item.id] || false
            }))
          }))
          
          setChecklist(mergedChecklist)
        } else {
          // Initialize with default checklist
          setChecklist(userRole === 'executive' ? executiveChecklist : supervisorChecklist)
        }
      } catch (error) {
        console.error('Error loading checklist:', error)
      } finally {
        setLoading(false)
      }
    }

    loadChecklist()
  }, [user, userRole])

  const handleToggleItem = async (sectionIndex: number, itemIndex: number) => {
    if (!user) return

    const newChecklist = [...checklist]
    const item = newChecklist[sectionIndex].items[itemIndex]
    item.completed = !item.completed

    setChecklist(newChecklist)

    try {
      // Save to Firestore
      const checklistRef = doc(db, `users/${user.uid}/onboarding/checklist`)
      const checklistData = newChecklist.reduce((acc, section) => {
        section.items.forEach(item => {
          acc[item.id] = item.completed
        })
        return acc
      }, {} as Record<string, boolean>)

      await setDoc(checklistRef, checklistData, { merge: true })
    } catch (error) {
      console.error('Error saving checklist:', error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <Card className="bg-white shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Getting Started Guide</CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <Collapsible open={isOpen}>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-6">
              {checklist.map((section, sectionIndex) => (
                <div key={section.title} className="space-y-3">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    {section.title}
                  </h3>
                  <div className="space-y-2">
                    {section.items.map((item, itemIndex) => (
                      <button
                        key={item.id}
                        onClick={() => handleToggleItem(sectionIndex, itemIndex)}
                        className={cn(
                          "flex items-center w-full p-2 rounded-lg text-sm transition-colors",
                          "hover:bg-muted/50",
                          item.completed && "text-muted-foreground"
                        )}
                      >
                        <div className="flex items-center flex-1">
                          <CheckCircle2 
                            className={cn(
                              "h-4 w-4 mr-2",
                              item.completed ? "text-green-500" : "text-gray-300"
                            )} 
                          />
                          <span className={item.completed ? "line-through" : ""}>
                            {item.title}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
} 
