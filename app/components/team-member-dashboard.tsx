'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function TeamMemberDashboard() {
  const courses = [
    { id: 1, name: 'Introduction to Project Management', progress: 100 },
    { id: 2, name: 'Effective Communication Skills', progress: 60 },
    { id: 3, name: 'Time Management Essentials', progress: 30 },
    { id: 4, name: 'Leadership Fundamentals', progress: 0 },
  ]

  const overallProgress = courses.reduce((acc, course) => acc + course.progress, 0) / courses.length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-black">My Learning Dashboard</h2>
          <p className="text-gray-600">Track your progress and upcoming courses</p>
        </div>
        <select className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-black">
          <option>This Week</option>
          <option>This Month</option>
          <option>This Quarter</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-black">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-black">{overallProgress.toFixed(0)}%</span>
                <span className="text-green-600">completed</span>
              </div>
              <Progress value={overallProgress} className="h-2 bg-gray-100" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-black">Courses Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-black">
                {courses.filter(c => c.progress === 100).length}
              </span>
              <span className="text-purple-600">of {courses.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-black">Next Due Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-black">3</span>
              <span className="text-orange-600">days</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-black">My Courses</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-350px)]">
            <div className="space-y-6">
              {courses.map((course) => (
                <div key={course.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-black">{course.name}</h3>
                      <p className="text-sm text-gray-600">
                        {course.progress}% Complete
                      </p>
                    </div>
                    {course.progress < 100 && (
                      <Button>
                        Continue Course
                      </Button>
                    )}
                  </div>
                  <Progress value={course.progress} className="h-2 bg-gray-100" />
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

