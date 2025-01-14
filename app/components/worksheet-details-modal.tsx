'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface WorksheetDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  worksheet: {
    id: number;
    name: string;
    currentTraining?: string;
    percentageCompleted: number;
    status: string;
    supervisor?: string;
    department?: string;
  };
  employees?: Array<{
    id: number;
    name: string;
    role: string;
    yearsWithCompany: number;
    meetings?: {
      total: number;
      attended: number;
    };
    worksheets?: {
      total: number;
      completed: number;
    };
    boldActions?: {
      total: number;
      completed: number;
    };
    progressHistory?: Array<{
      month: string;
      progress: number;
    }>;
  }>;
  supervisors?: Array<{
    id: number;
    name: string;
    department: string;
    yearsWithCompany?: number;
    worksheets?: {
      total: number;
      completed: number;
    };
    teamSize?: number;
    performanceRating?: number;
  }>;
}

export function WorksheetDetailsModal({
  isOpen,
  onClose,
  worksheet,
  employees,
  supervisors
}: WorksheetDetailsModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const items = employees || supervisors || []
  const currentItem = items[currentIndex]

  const navigateItem = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentIndex(prev => 
        prev === 0 ? items.length - 1 : prev - 1
      )
    } else {
      setCurrentIndex(prev => 
        prev === items.length - 1 ? 0 : prev + 1
      )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-[1200px] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            Individual Worksheet Review: {worksheet.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 mt-6">
          {/* Left Column - Employee Info and Navigation */}
          <div className="space-y-6">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                  <span>{currentItem.name}</span>
                  <span className="text-sm font-normal text-white/60">
                    {currentIndex + 1} of {items.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-white/60">
                    {supervisors ? 'Department' : 'Role'}
                  </p>
                  <p className="font-medium text-white">
                    {supervisors ? currentItem.department : currentItem.role}
                  </p>
                  {currentItem.yearsWithCompany && (
                    <>
                      <p className="text-sm text-white/60">Years with Company</p>
                      <p className="font-medium text-white">{currentItem.yearsWithCompany}</p>
                    </>
                  )}
                  {supervisors && currentItem.teamSize && (
                    <>
                      <p className="text-sm text-white/60">Team Size</p>
                      <p className="font-medium text-white">{currentItem.teamSize}</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateItem('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateItem('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* KPIs */}
            <Card>
              <CardHeader>
                <CardTitle>KPIs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm font-medium">Consistency of Meetings</p>
                    <p className="text-sm text-muted-foreground">
                      {currentItem.meetings?.attended ?? 0}/{currentItem.meetings?.total ?? 0}
                    </p>
                  </div>
                  <Progress 
                    value={currentItem.meetings?.total 
                      ? (currentItem.meetings.attended / currentItem.meetings.total) * 100 
                      : 0} 
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm font-medium">Status of Worksheets</p>
                    <p className="text-sm text-muted-foreground">
                      {currentItem.worksheets?.completed ?? 0}/{currentItem.worksheets?.total ?? 0}
                    </p>
                  </div>
                  <Progress 
                    value={currentItem.worksheets?.total
                      ? (currentItem.worksheets.completed / currentItem.worksheets.total) * 100
                      : 0}
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="text-sm font-medium">Completion of Bold Actions</p>
                    <p className="text-sm text-muted-foreground">
                      {currentItem.boldActions?.completed ?? 0}/{currentItem.boldActions?.total ?? 0}
                    </p>
                  </div>
                  <Progress 
                    value={currentItem.boldActions?.total
                      ? (currentItem.boldActions.completed / currentItem.boldActions.total) * 100
                      : 0}
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Progress History and Worksheet Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Progress History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] relative">
                  <div className="absolute inset-0 flex items-end justify-between px-4">
                    {currentItem.progressHistory?.map((item, index) => (
                      <div key={index} className="flex flex-col items-center gap-2">
                        <div 
                          className="w-8 bg-purple-500 rounded-t"
                          style={{ height: `${item.progress}%` }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {item.month}
                        </span>
                      </div>
                    )) ?? <div>No progress history available</div>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Worksheet Details: {worksheet.currentTraining}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 text-lg">Top 3 Insights:</h4>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Insight 1: Understanding the importance of component lifecycle in React</li>
                    <li>Insight 2: Mastering state management patterns for complex applications</li>
                    <li>Insight 3: Implementing performance optimizations using React's built-in features</li>
                  </ul>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2 text-lg">Big Idea:</h4>
                  <p className="text-muted-foreground">
                    React's declarative nature and component-based architecture significantly simplify the process of building complex user interfaces, leading to more maintainable and scalable applications.
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2 text-lg">Bold Action:</h4>
                  <p className="text-muted-foreground">
                    Refactor a key feature in our main project using React hooks and context API to improve state management and reduce prop drilling.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

