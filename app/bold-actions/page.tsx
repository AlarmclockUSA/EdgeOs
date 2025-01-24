'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { db } from '@/lib/firebase'
import { collection, doc, getDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore'
import { Loader2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BoldActionModal } from '@/components/bold-action-modal'

interface BoldAction {
  id: string
  action: string
  status: 'active' | 'completed'
  createdAt: Timestamp | { seconds: number, nanoseconds: number } | Date | string
  completedAt?: Timestamp | { seconds: number, nanoseconds: number } | Date | string
  timeframe: string
  actualTimeframe?: string
  reflectionNotes?: string
  worksheetId?: string
}

function formatDate(date: Timestamp | { seconds: number, nanoseconds: number } | Date | string | undefined): string {
  if (!date) return ''
  
  // Handle string dates (ISO format)
  if (typeof date === 'string') {
    return new Date(date).toLocaleDateString()
  }
  
  // Handle Date objects
  if (date instanceof Date) {
    return date.toLocaleDateString()
  }
  
  // Handle Firestore Timestamp
  if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
    return date.toDate().toLocaleDateString()
  }
  
  // Handle Firestore Timestamp-like objects
  if (typeof date === 'object' && 'seconds' in date && typeof date.seconds === 'number') {
    return new Date(date.seconds * 1000).toLocaleDateString()
  }
  
  return ''
}

function BoldActionsList({ actions, status, onComplete }: { 
  actions: BoldAction[], 
  status: 'active' | 'completed',
  onComplete: (action: BoldAction) => void 
}) {
  if (actions.length === 0) {
    return (
      <div className="text-[#666666] text-center py-8">
        No {status} bold actions found
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {actions.map((action) => (
        <Card key={action.id} className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <h3 className="font-medium text-[#333333]">{action.action}</h3>
                <div className="text-sm text-[#666666]">
                  <p>Created: {formatDate(action.createdAt)}</p>
                  {action.completedAt && (
                    <p>Completed: {formatDate(action.completedAt)}</p>
                  )}
                </div>
                {action.actualTimeframe && (
                  <p className="text-sm text-[#666666]">Actual Timeframe: {action.actualTimeframe}</p>
                )}
                {action.reflectionNotes && (
                  <div className="text-sm">
                    <p className="font-medium text-[#333333]">Reflection Notes:</p>
                    <p className="text-[#666666] whitespace-pre-wrap">{action.reflectionNotes}</p>
                  </div>
                )}
              </div>
              <div className="text-right space-y-2">
                <span className="text-sm font-medium block text-[#333333]">
                  Timeframe: {action.timeframe}
                </span>
                {status === 'active' && (
                  <Button 
                    onClick={() => onComplete(action)}
                    className="bg-[#0056D2] text-white hover:bg-[#EAF4FE] hover:text-[#0056D2]"
                    variant="outline"
                    size="sm"
                  >
                    <Info className="w-4 h-4 mr-2" />
                    Complete
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function BoldActionsPage() {
  const { user } = useAuth()
  const [boldActions, setBoldActions] = useState<BoldAction[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<BoldAction | null>(null)

  const handleComplete = useCallback((action: BoldAction) => {
    setSelectedAction(action)
    setIsModalOpen(true)
  }, [])

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false)
    setSelectedAction(null)
  }, [])

  const handleActionComplete = useCallback(async (id: string) => {
    // Refresh the bold actions list after completion
    fetchBoldActions()
  }, [])

  const fetchBoldActions = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (!userDoc.exists()) return

      const boldActionsRef = collection(db, `users/${user.uid}/boldActions`)
      const boldActionsQuery = query(
        boldActionsRef,
        orderBy('createdAt', 'desc')
      )

      const snapshot = await getDocs(boldActionsQuery)
      const actions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BoldAction[]

      setBoldActions(actions)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching bold actions:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBoldActions()
  }, [user])

  const activeActions = boldActions.filter(action => action.status === 'active')
  const completedActions = boldActions.filter(action => action.status === 'completed')

  return (
    <div>
      <Card className="bg-white rounded-none border-0">
        <CardHeader>
          <CardTitle className="text-[#333333]">Bold Actions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="bg-gray-100">
                <TabsTrigger value="active" className="text-[#666666] data-[state=active]:text-[#333333] data-[state=active]:bg-white">Active ({activeActions.length})</TabsTrigger>
                <TabsTrigger value="completed" className="text-[#666666] data-[state=active]:text-[#333333] data-[state=active]:bg-white">Completed ({completedActions.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="active" className="mt-6">
                <BoldActionsList 
                  actions={activeActions} 
                  status="active" 
                  onComplete={handleComplete}
                />
              </TabsContent>
              <TabsContent value="completed" className="mt-6">
                <BoldActionsList 
                  actions={completedActions} 
                  status="completed" 
                  onComplete={handleComplete}
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {selectedAction && (
        <BoldActionModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          boldAction={{
            id: selectedAction.id,
            action: selectedAction.action,
            timeframe: selectedAction.timeframe,
            completedAt: selectedAction.completedAt as any,
            createdAt: selectedAction.createdAt as any,
            status: selectedAction.status,
            actualTimeframe: selectedAction.actualTimeframe,
            reflectionNotes: selectedAction.reflectionNotes
          }}
          onComplete={handleActionComplete}
        />
      )}
    </div>
  )
} 