import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const response = await fetch(`https://edge.tribesocial.io/api/collection/105`, {
      headers: {
        'token': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTk5ODMsImlhdCI6MTczNDQ2MTc5OSwiZXhwIjo0MzI2NDYxNzk5fQ.N_6K1N63zK3UhWUBsSH4hwFUeM24U9u9Y_qvsaY9jdg'
      }
    })

    if (!response.ok) {
      console.error('Failed to fetch collection:', response.status, response.statusText)
      return NextResponse.json({ error: 'Failed to fetch collection' }, { status: response.status })
    }

    const data = await response.json()
    console.log('Tribe collection response:', data)

    // Find the specific content item in the collection
    const contentItem = data.find((item: any) => item.id.toString() === params.id)
    
    if (!contentItem) {
      return NextResponse.json({ error: 'Content not found in collection' }, { status: 404 })
    }

    return NextResponse.json({
      videoUrl: contentItem.video || null,
      featuredImage: contentItem.featuredImage || null,
      title: contentItem.title,
      description: contentItem.description
    })
  } catch (error) {
    console.error('Error fetching collection:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 