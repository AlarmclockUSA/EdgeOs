import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Video, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

export function UpcomingStandups() {
  const [standups, setStandups] = useState([]);
  const [selectedStandup, setSelectedStandup] = useState(null);
  const [notes, setNotes] = useState('');
  const [completing, setCompleting] = useState(null);
  const [userRole, setUserRole] = useState('executive'); // Assuming a default user role

  const handleComplete = async () => {
    if (selectedStandup) {
      setCompleting(selectedStandup.id);
      // Replace with actual API call to complete the standup
      // For now, we'll just simulate a completion
      setTimeout(() => {
        setSelectedStandup(null);
        setCompleting(null);
      }, 2000);
    }
  };

  return (
    <>
      <ScrollArea className="h-[300px]">
        <div className="space-y-4">
          {standups.length > 0 ? (
            standups.map((standup) => (
              <div
                key={standup.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
              >
                <div>
                  <p className="font-medium text-[#333333]">
                    {standup.teamMemberName}
                  </p>
                  <p className="text-sm text-[#666666]">
                    {format(standup.scheduledFor, 'MMM d, yyyy')} at {format(standup.scheduledFor, 'h:mm a')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startMeeting(standup.meetingLink)}
                    disabled={!standup.meetingLink}
                    className="bg-[#0056D2] text-white hover:bg-[#EAF4FE] hover:text-[#0056D2]"
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Start Meeting
                  </Button>
                  {(userRole === 'executive' || userRole === 'supervisor') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedStandup(standup)}
                      disabled={completing === standup.id}
                      className="bg-[#0056D2] text-white hover:bg-[#EAF4FE] hover:text-[#0056D2]"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Complete
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No upcoming standups scheduled</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Only render dialog for supervisors and executives */}
      {(userRole === 'executive' || userRole === 'supervisor') && (
        <Dialog open={!!selectedStandup} onOpenChange={(open) => !open && setSelectedStandup(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Standup with {selectedStandup?.teamMemberName}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="Enter meeting notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[150px]"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedStandup(null)}
                className="mr-2"
              >
                Cancel
              </Button>
              <Button
                onClick={handleComplete}
                disabled={completing === selectedStandup?.id || !notes.trim()}
                className="bg-[#0056D2] text-white hover:bg-[#0056D2]/90"
              >
                {completing === selectedStandup?.id ? 'Completing...' : 'Complete Standup'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
} 