import { NextResponse } from 'next/server'
import { tribeApiFetch } from '@/lib/tribe-api'

export async function GET() {
  try {
    console.log('Making request to Tribe API...')
    const tribeContent = await tribeApiFetch(`/api/collection-by-id/99735660`, {
      method: 'GET'
    })
    
    console.log('Raw Tribe API response for first item:', {
      firstItem: tribeContent?.Contents?.[0],
      availableFields: tribeContent?.Contents?.[0] ? Object.keys(tribeContent.Contents[0]) : [],
      mediaFields: tribeContent?.Contents?.[0] ? {
        featuredImage: tribeContent.Contents[0].featuredImage,
        image: tribeContent.Contents[0].image,
        thumbnail: tribeContent.Contents[0].thumbnail,
        media: tribeContent.Contents[0].media,
        coverImage: tribeContent.Contents[0].coverImage,
        imageUrl: tribeContent.Contents[0].imageUrl,
        rawItem: JSON.stringify(tribeContent.Contents[0])
      } : null
    })
    
    return NextResponse.json(tribeContent)
  } catch (error: any) {
    console.error('Error fetching from Tribe:', {
      name: error.name,
      message: error.message,
      status: error.status,
      response: error.response,
      stack: error.stack
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch content from Tribe',
        details: error.message,
        status: error.status,
        response: error.response
      },
      { status: error.status || 500 }
    )
  }
} 