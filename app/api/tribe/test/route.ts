import { NextResponse } from 'next/server'
import { getPlatformInfo } from '@/lib/tribe-api'

export async function GET() {
  try {
    const platformInfo = await getPlatformInfo()
    return NextResponse.json(platformInfo)
  } catch (error) {
    console.error('Tribe API Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch platform info' },
      { status: 500 }
    )
  }
} 