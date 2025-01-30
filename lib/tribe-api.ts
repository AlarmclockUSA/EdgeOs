import { headers } from 'next/headers'

const TRIBE_API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTk5ODMsImlhdCI6MTczNDQ2MTc5OSwiZXhwIjo0MzI2NDYxNzk5fQ.N_6K1N63zK3UhWUBsSH4hwFUeM24U9u9Y_qvsaY9jdg"
const TRIBE_API_URL = "https://edge.tribesocial.io"

interface TribeApiOptions {
  method?: string
  body?: any
  headers?: HeadersInit
}

class TribeApiError extends Error {
  status?: number
  response?: any
  
  constructor(message: string) {
    super(message)
    this.name = 'TribeApiError'
  }
}

export async function tribeApiFetch(endpoint: string, options: TribeApiOptions = {}) {
  const { method = 'GET', body, headers: customHeaders = {} } = options

  const requestHeaders: HeadersInit = {
    'Cookie': `token=${TRIBE_API_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...customHeaders
  }

  console.log('Making Tribe API request:', {
    url: `${TRIBE_API_URL}${endpoint}`,
    method,
    headers: requestHeaders,
    fullRequest: {
      url: `${TRIBE_API_URL}${endpoint}`,
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined
    }
  })

  try {
    const response = await fetch(`${TRIBE_API_URL}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    })

    console.log('Raw response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      url: response.url
    })

    // Try to get the raw text first
    const rawText = await response.text()
    console.log('Raw response text:', rawText)

    // Then parse it as JSON if possible
    let responseData
    try {
      responseData = JSON.parse(rawText)
    } catch (e) {
      console.error('Failed to parse response as JSON:', e)
      throw new Error(`Failed to parse response as JSON: ${rawText.substring(0, 200)}...`)
    }
    
    console.log('Tribe API response:', {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      url: `${TRIBE_API_URL}${endpoint}`
    })

    if (!response.ok) {
      const error = new TribeApiError(responseData.message || 'An error occurred while fetching data')
      error.status = response.status
      error.response = responseData
      throw error
    }

    return responseData
  } catch (error) {
    console.error('Fetch error:', error)
    throw error
  }
}

// Platform Management
export async function getPlatformInfo() {
  return tribeApiFetch('/platform/info')
}

// User Management
export async function getAllUsers(params?: { page?: number; limit?: number }) {
  const queryParams = new URLSearchParams(params as any).toString()
  return tribeApiFetch(`/users?${queryParams}`)
}

export async function getUser(userId: string) {
  return tribeApiFetch(`/users/${userId}`)
}

export async function createOrganization(name: string) {
  return tribeApiFetch('/organizations', {
    method: 'POST',
    body: {
      name,
      description: `Organization for ${name}`
    }
  })
}

export async function addUserToOrganization(userId: string, organizationId: string, role: string) {
  return tribeApiFetch(`/organizations/${organizationId}/members`, {
    method: 'POST',
    body: {
      userId,
      role
    }
  })
}

// Content Management
export async function getContent(params?: { page?: number; limit?: number }) {
  const queryParams = new URLSearchParams(params as any).toString()
  return tribeApiFetch(`/content?${queryParams}`)
}

export async function createContent(data: any) {
  return tribeApiFetch('/content', {
    method: 'POST',
    body: data
  })
}

// Analytics
export async function getViewData() {
  return tribeApiFetch('/analytics/views')
}

export async function createViewEvent(contentId: string) {
  return tribeApiFetch('/analytics/views', {
    method: 'POST',
    body: { contentId }
  })
}

// Groups
export async function getGroups(params?: { page?: number; limit?: number }) {
  const queryParams = new URLSearchParams(params as any).toString()
  return tribeApiFetch(`/groups?${queryParams}`)
}

export async function createGroup(data: any) {
  return tribeApiFetch('/groups', {
    method: 'POST',
    body: data
  })
} 