import { NextResponse } from 'next/server'
import { tribeApiFetch } from '@/lib/tribe-api'

export async function POST(request: Request) {
  try {
    const { contentId } = await request.json()
    
    // Track view in Tribe analytics
    await tribeApiFetch('/api/analytics/views', {
      method: 'POST',
      body: { contentId }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking view:', error)
    return NextResponse.json(
      { error: 'Failed to track view' },
      { status: 500 }
    )
  }
} 