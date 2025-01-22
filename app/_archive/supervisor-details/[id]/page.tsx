'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore'
import { toast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SupervisorKPIs {
  currentBoldAction: string | null
  lastCompletedBoldAction: string | null
  currentTraining: string | null
  lastCompletedTraining: string | null
  completedTrainings: number
  completedWorksheets: number
  activeBoldActions: number
  completedBoldActions: number
  overallProgress: number
}

interface MeetingNote {
  date: Timestamp
  note: string
  boldAction?: string
  expectedTimeframe?: string
}

export default function SupervisorDetailsPage({ params }: { params: { id: string } }) {
  const [supervisor, setSupervisor] = useState<any>(null)
  const [supervisorKPIs, setSupervisorKPIs] = useState<SupervisorKPIs | null>(null)
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([])
  const [newNote, setNewNote] = useState('')
  const [newBoldAction, setNewBoldAction] = useState('')
  const [newExpectedTimeframe, setNewExpectedTimeframe] = useState<string | undefined>(undefined)
  const [isAddingBoldAction, setIsAddingBoldAction] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchSupervisorData = async () => {
      setLoading(true)
      try {
        const supervisorDoc = await getDoc(doc(db, 'users', params.id))
        if (supervisorDoc.exists()) {
          const userData = supervisorDoc.data()
          setSupervisor(userData)
          
          // Fetch KPIs
          const kpisData = {
            currentBoldAction: userData.currentBoldAction || null,
            lastCompletedBoldAction: userData.lastCompletedBoldAction || null,
            currentTraining: userData.currentTraining || null,
            lastCompletedTraining: userData.lastCompletedTraining || null,
            completedTrainings: userData.completedTrainings || 0,
            completedWorksheets: userData.completedWorksheets || 0,
            activeBoldActions: userData.activeBoldActions || 0,
            completedBoldActions: userData.completedBoldActions || 0,
            overallProgress: userData.overallProgress || 0
          }
          setSupervisorKPIs(kpisData)

          // Fetch meeting notes
          setMeetingNotes(userData.meetingNotes || [])
        } else {
          toast({
            title: "Error",
            description: "Supervisor not found",
            variant: "destructive",
          })
          router.push('/dashboard/executive')
        }
      } catch (error) {
        console.error('Error fetching supervisor data:', error)
        toast({
          title: "Error",
          description: "Failed to fetch supervisor data. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSupervisorData()
  }, [params.id, router])

  const saveMeetingNote = async () => {
    if (newNote.trim()) {
      try {
        const newMeetingNote: MeetingNote = {
          date: Timestamp.now(),
          note: newNote.trim(),
        }

        if (isAddingBoldAction && newBoldAction.trim() && newExpectedTimeframe) {
          newMeetingNote.boldAction = newBoldAction.trim();
          newMeetingNote.expectedTimeframe = newExpectedTimeframe;
        }

        const supervisorRef = doc(db, 'users', params.id)
        await updateDoc(supervisorRef, {
          meetingNotes: arrayUnion(newMeetingNote)
        })

        setMeetingNotes([...meetingNotes, newMeetingNote])
        setNewNote('')
        setNewBoldAction('')
        setNewExpectedTimeframe(undefined)
        setIsAddingBoldAction(false)

        toast({
          title: "Success",
          description: "Meeting note saved successfully.",
        })
      } catch (error) {
        console.error('Error saving meeting note:', error)
        toast({
          title: "Error",
          description: "Failed to save meeting note. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
  }

  if (!supervisor || !supervisorKPIs) {
    return <div className="flex justify-center items-center h-screen">Supervisor not found</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button onClick={() => router.push('/executive')} variant="outline">
        Back to Executive Dashboard
      </Button>
      
      <h1 className="text-3xl font-bold">{supervisor.firstName} {supervisor.lastName}</h1>
      <p className="text-lg text-muted-foreground">{supervisor.email}</p>

      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{supervisorKPIs.overallProgress.toFixed(1)}% Complete</span>
              <span>{48 - (supervisorKPIs.completedTrainings + supervisorKPIs.completedWorksheets + supervisorKPIs.completedBoldActions)} Remaining</span>
            </div>
            <Progress value={supervisorKPIs.overallProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bold Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-semibold">Current:</p>
              <p className="text-sm">{supervisorKPIs.currentBoldAction || 'No active Bold Action'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Last Completed:</p>
              <p className="text-sm">{supervisorKPIs.lastCompletedBoldAction || 'No completed Bold Actions'}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Active:</span>
              <span className="font-semibold">{supervisorKPIs.activeBoldActions}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Completed:</span>
              <span className="font-semibold">{supervisorKPIs.completedBoldActions}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trainings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-semibold">Current:</p>
              <p className="text-sm">{supervisorKPIs.currentTraining || 'No active Training'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Last Completed:</p>
              <p className="text-sm">{supervisorKPIs.lastCompletedTraining || 'No completed Trainings'}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Completed:</span>
              <span className="font-semibold">{supervisorKPIs.completedTrainings}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Worksheets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{supervisorKPIs.completedWorksheets}</div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meeting Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Bold Action</TableHead>
                <TableHead>Expected Timeframe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetingNotes.map((note, index) => (
                <TableRow key={index}>
                  <TableCell>{note.date.toDate().toLocaleDateString()}</TableCell>
                  <TableCell>{note.note}</TableCell>
                  <TableCell>{note.boldAction || 'N/A'}</TableCell>
                  <TableCell>{note.expectedTimeframe || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 space-y-4">
            <Textarea
              placeholder="Add a new meeting note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="add-bold-action"
                checked={isAddingBoldAction}
                onCheckedChange={(checked) => setIsAddingBoldAction(checked as boolean)}
              />
              <Label htmlFor="add-bold-action">Add Bold Action</Label>
            </div>
            {isAddingBoldAction && (
              <>
                <Input
                  placeholder="Enter new Bold Action"
                  value={newBoldAction}
                  onChange={(e) => setNewBoldAction(e.target.value)}
                />
                <Select value={newExpectedTimeframe} onValueChange={setNewExpectedTimeframe}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select expected timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 Week">1 Week</SelectItem>
                    <SelectItem value="2 Weeks">2 Weeks</SelectItem>
                    <SelectItem value="3 Weeks">3 Weeks</SelectItem>
                    <SelectItem value="1 Month">1 Month</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
            <Button onClick={saveMeetingNote}>Save Note</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

