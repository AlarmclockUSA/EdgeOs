'use client'

import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function CompletedTrainings() {
  const completedTrainings = useSelector((state: RootState) => state.trainings.completedTrainings);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-4">Completed Trainings</h2>
      {completedTrainings.length > 0 ? (
        completedTrainings.map((training) => (
          <Card key={training.id}>
            <CardHeader>
              <CardTitle>{training.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Completed on: {new Date(training.completedDate).toLocaleDateString()}</p>
              {/* Add more training details here */}
            </CardContent>
          </Card>
        ))
      ) : (
        <p>No completed trainings yet.</p>
      )}
    </div>
  );
}

