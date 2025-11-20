import { NextRequest, NextResponse } from 'next/server';

// Handle base /socket.io route (no subpath)
export async function GET(request: NextRequest) {
  return proxyToBackend(request);
}

export async function POST(request: NextRequest) {
  return proxyToBackend(request);
}

async function proxyToBackend(request: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001';
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${backendUrl}/socket.io/${searchParams ? `?${searchParams}` : ''}`;

  console.log('[Socket.IO Proxy] Proxying request to:', url);

  try {
    const headers = new Headers();
    
    // Forward important headers
    const forwardHeaders = [
      'content-type',
      'accept',
      'cookie',
      'authorization',
    ];
    
    forwardHeaders.forEach(header => {
      const value = request.headers.get(header);
      if (value) {
        headers.set(header, value);
      }
    });

    const options: RequestInit = {
      method: request.method,
      headers,
    };

    // Only include body for POST requests
    if (request.method === 'POST') {
      options.body = await request.text();
    }

    const response = await fetch(url, options);
    
    // Get response body
    const data = await response.text();
    
    console.log('[Socket.IO Proxy] Response status:', response.status);
    
    // Create response with same status and headers
    const proxyResponse = new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
    });

    // Forward response headers
    response.headers.forEach((value, key) => {
      proxyResponse.headers.set(key, value);
    });

    return proxyResponse;
  } catch (error) {
    console.error('[Socket.IO Proxy] Error:', error);
    return new NextResponse('Proxy error', { status: 502 });
  }
}
