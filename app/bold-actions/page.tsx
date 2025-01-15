'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { CheckCircle, Clock, AlertCircle, Search } from 'lucide-react'
import { BoldActionModal } from '@/components/bold-action-modal'
import { StyledCard } from '@/components/StyledCard'

interface BoldAction {
  id: string
  action: string
  status: 'active' | 'completed'
  createdAt: Date
  completedAt: Date | { toDate: () => Date } | null
  timeframe: string
  actualTimeframe?: string
}

export default function BoldActions() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [boldActions, setBoldActions] = useState<BoldAction[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAction, setSelectedAction] = useState<BoldAction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin')
    } else if (user) {
      fetchBoldActions()
    }
  }, [user, loading, router])

  const fetchBoldActions = async () => {
    if (!user) return

    try {
      const boldActionsRef = collection(db, 'boldActions')
      const q = query(
        boldActionsRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )
      const querySnapshot = await getDocs(q)
      
      const actions: BoldAction[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        completedAt: doc.data().completedAt?.toDate(),
      } as BoldAction))
      
      setBoldActions(actions)
    } catch (error) {
      console.error('Error fetching bold actions:', error)
      toast({
        title: "Error",
        description: "Failed to fetch bold actions. Please try again later.",
        variant: "destructive",
      })
    }
  }

  const filteredActions = boldActions.filter(action =>
    action.action.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleActionComplete = async (actionId: string) => {
    setIsModalOpen(false)
    await fetchBoldActions()
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <StyledCard title="Bold Actions Tracker">
        <div className="flex items-center space-x-2 mb-4">
          <Search className="h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search bold actions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow bg-white text-black border-gray-300"
          />
        </div>
        
        {filteredActions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Timeframe</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActions.map((action) => (
                <TableRow key={action.id}>
                  <TableCell className="text-gray-900">{action.action}</TableCell>
                  <TableCell>
                    {action.status === 'completed' ? (
                      <div className="flex items-center">
                        <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                        <span className="text-gray-900">Completed</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Clock className="mr-2 h-5 w-5 text-yellow-500" />
                        <span className="text-gray-900">Active</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-900">{action.createdAt.toLocaleDateString()}</TableCell>
                  <TableCell className="text-gray-900">{action.timeframe}</TableCell>
                  <TableCell>
                    <Button
                      onClick={() => {
                        setSelectedAction(action)
                        setIsModalOpen(true)
                      }}
                      variant="outline"
                      size="sm"
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center text-muted-foreground">
            <AlertCircle className="mx-auto h-8 w-8 mb-2" />
            <p>No bold actions found.</p>
          </div>
        )}
      </StyledCard>

      {selectedAction && (
        <BoldActionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          boldAction={selectedAction}
          onComplete={handleActionComplete}
        />
      )}
    </div>
  )
}

