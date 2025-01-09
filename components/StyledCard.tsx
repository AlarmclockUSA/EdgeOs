import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StyledCardProps {
  title: string;
  children: React.ReactNode;
}

export function StyledCard({ title, children }: StyledCardProps) {
  return (
    <Card className="border-none">
      <CardHeader className="bg-black text-white rounded-t-lg">
        <CardTitle className="text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="bg-white text-black pt-4 shadow-lg rounded-lg">
        {children}
      </CardContent>
    </Card>
  )
}

