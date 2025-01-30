'use client'

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { PlatformIcon } from './platform-icons';

export function VirtualMeetingSettings() {
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingType, setMeetingType] = useState<'zoom' | 'teams' | 'meet' | 'other'>('zoom');
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.uid) return;
    
    const fetchSettings = async () => {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const data = userDoc.data();
      if (data?.virtualMeetingUrl) {
        setMeetingUrl(data.virtualMeetingUrl);
        setMeetingType(data.virtualMeetingType || 'zoom');
      }
    };

    fetchSettings();
  }, [user?.uid]);

  const handleSave = async () => {
    if (!user?.uid || !meetingUrl) return;
    
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        virtualMeetingUrl: meetingUrl,
        virtualMeetingType: meetingType,
        updatedAt: serverTimestamp()
      });
      toast({
        title: "Success",
        description: "Meeting room link saved successfully",
      });
    } catch (error) {
      console.error('Error saving meeting room link:', error);
      toast({
        title: "Error",
        description: "Failed to save meeting room link",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const getPlaceholderUrl = (type: string) => {
    switch (type) {
      case 'zoom':
        return 'https://zoom.us/j/1234567890'
      case 'teams':
        return 'https://teams.microsoft.com/l/meetup-join/meeting-id'
      case 'meet':
        return 'https://meet.google.com/abc-defg-hij'
      default:
        return 'https://your-meeting-url'
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-[#333333]">Meeting Platform</Label>
        <Select 
          value={meetingType} 
          onValueChange={(value: 'zoom' | 'teams' | 'meet' | 'other') => setMeetingType(value)}
        >
          <SelectTrigger className="bg-white text-black border-gray-200">
            <div className="flex items-center gap-2">
              <PlatformIcon platform={meetingType} className="h-5 w-5" />
              <SelectValue placeholder="Select platform" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="zoom">
              <span>Zoom</span>
            </SelectItem>
            <SelectItem value="teams">
              <span>Microsoft Teams</span>
            </SelectItem>
            <SelectItem value="meet">
              <span>Google Meet</span>
            </SelectItem>
            <SelectItem value="other">
              <span>Other</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-[#333333]">Meeting Room URL</Label>
        <Input
          placeholder={getPlaceholderUrl(meetingType)}
          value={meetingUrl}
          onChange={(e) => setMeetingUrl(e.target.value)}
          className="bg-white text-black border-gray-200"
        />
        <p className="text-sm text-gray-500">
          This is your permanent virtual meeting room where you'll host team standups and other meetings with your direct reports
        </p>
      </div>

      <Button 
        onClick={handleSave} 
        disabled={isSaving || !meetingUrl}
        className="w-full sm:w-auto bg-white text-black border border-gray-200 hover:bg-gray-50"
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : 'Save Meeting Link'}
      </Button>
    </div>
  );
} 