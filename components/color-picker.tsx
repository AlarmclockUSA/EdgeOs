import { useState, useEffect } from 'react'
import { HexColorPicker } from "react-colorful"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { db } from '@/lib/firebase'
import { doc, updateDoc, onSnapshot } from 'firebase/firestore'
import { useAuth } from '@/lib/auth-context'
import { toast } from "@/components/ui/use-toast"

export function ColorPicker() {
  const [color, setColor] = useState("#6366f1")
  const { companyName } = useAuth()

  useEffect(() => {
    if (companyName) {
      const unsubscribe = onSnapshot(doc(db, 'companies', companyName), (doc) => {
        if (doc.exists()) {
          setColor(doc.data().themeColor || "#6366f1")
        }
      })
      return () => unsubscribe()
    }
  }, [companyName])

  const handleColorChange = (newColor: string) => {
    setColor(newColor)
  }

  const handleSave = async () => {
    if (!companyName) {
      toast({
        title: "Error",
        description: "Company name not found. Please try again later.",
        variant: "destructive",
      })
      return
    }

    try {
      await updateDoc(doc(db, 'companies', companyName), {
        themeColor: color
      })
      toast({
        title: "Success",
        description: "Theme color updated successfully.",
      })
    } catch (error) {
      console.error('Error updating theme color:', error)
      toast({
        title: "Error",
        description: "Failed to update theme color. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <Label htmlFor="theme-color">Theme Color</Label>
      <div className="flex space-x-4">
        <HexColorPicker color={color} onChange={handleColorChange} />
        <div className="space-y-2">
          <Input
            id="theme-color"
            value={color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-28"
          />
          <div 
            className="w-28 h-28 rounded-md border border-input" 
            style={{ backgroundColor: color }}
          />
        </div>
      </div>
      <Button onClick={handleSave}>Save Theme Color</Button>
    </div>
  )
}

