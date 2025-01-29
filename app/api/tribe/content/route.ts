import { NextResponse } from 'next/server'
import { tribeApiFetch } from '@/lib/tribe-api'

export const revalidate = 3600; // Revalidate every hour

export async function GET() {
  try {
    console.log('Making request to Tribe API...')
    const tribeContent = await tribeApiFetch(`/api/collection-by-id/99735660`, {
      method: 'GET',
      next: {
        revalidate: 3600 // Cache for 1 hour
      }
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
    
    return NextResponse.json(tribeContent, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    })
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
      { 
        status: error.status || 500,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    )
  }
} 