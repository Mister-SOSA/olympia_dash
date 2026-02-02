import { NextRequest, NextResponse } from 'next/server';

// This is a catch-all API route that proxies Socket.IO requests to the backend
// It handles both GET (polling) and POST requests
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyToBackend(request, { params });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyToBackend(request, { params });
}

async function proxyToBackend(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001';
  const path = params.path?.join('/') || '';
  const searchParams = request.nextUrl.searchParams.toString();
  const url = `${backendUrl}/socket.io/${path}${searchParams ? `?${searchParams}` : ''}`;

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
    
    // Get response body as buffer to preserve binary data
    const data = await response.arrayBuffer();
    
    // Create response with same status and headers
    const proxyResponse = new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
    });

    // Forward response headers (exclude content-encoding to prevent double-decoding)
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding') {
        proxyResponse.headers.set(key, value);
      }
    });

    return proxyResponse;
  } catch (error) {
    console.error('Socket.IO proxy error:', error);
    return new NextResponse('Proxy error', { status: 502 });
  }
}
