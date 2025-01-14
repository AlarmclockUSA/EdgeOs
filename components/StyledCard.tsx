import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StyledCardProps {
  title: string;
  children: React.ReactNode;
}

export function StyledCard({ title, children }: StyledCardProps) {
  return (
    <Card className="border-none">
      <CardHeader className="bg-white rounded-t-lg border-b">
        <CardTitle className="text-2xl font-semibold text-black">{title}</CardTitle>
      </CardHeader>
      <CardContent className="bg-white pt-4 shadow-lg rounded-lg">
        {children}
      </CardContent>
    </Card>
  )
}

