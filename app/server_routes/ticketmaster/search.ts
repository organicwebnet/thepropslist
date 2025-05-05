import { type ExpoRequest } from 'expo-router/server';

// Use the non-prefixed variable for server-side access
const API_KEY = process.env.TICKETMASTER_API_KEY; 
const BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

// Original GET handler
export async function GET(request: Request): Promise<Response> {
    if (!API_KEY) {
        console.error('Server environment variable TICKETMASTER_API_KEY is missing.');
        return new Response(JSON.stringify(
            { error: 'Server configuration error: Ticketmaster API key is missing.' }), 
            { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            }
        );
    }

    // Extract search query using standard URL API
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
         return new Response(JSON.stringify(
            { error: 'Missing search query parameter.' }), 
            { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            }
        );
    }

    const searchUrl = `${BASE_URL}/events.json?apikey=${API_KEY}&keyword=${encodeURIComponent(query)}&countryCode=US&size=20`;
    console.log(`[API Route] Calling Ticketmaster: ${searchUrl}`);

    try {
        const tmResponse = await fetch(searchUrl);

        if (!tmResponse.ok) {
            const errorBody = await tmResponse.text();
            console.error(`[API Route] Ticketmaster API error (${tmResponse.status}):`, errorBody);
             return new Response(JSON.stringify(
                { error: `Ticketmaster API error: ${tmResponse.statusText}` }), 
                { 
                    status: tmResponse.status, 
                    headers: { 'Content-Type': 'application/json' } 
                }
             );
        }

        const tmData = await tmResponse.json();
        console.log(`[API Route] Received Ticketmaster data for query "${query}"`);

        // Return the data received from Ticketmaster
        return new Response(JSON.stringify(tmData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[API Route] Error fetching from Ticketmaster:', error);
         return new Response(JSON.stringify(
            { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown fetch error'}` }), 
            { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' } 
            }
        );
    }
}

// Keep the dummy default export (in case needed by router)
export default function ApiSearchRoute() {
  // This component should never be rendered for an API route,
  // but its presence might be needed by the router.
  console.log('[API Route - Search] Default export function called (should not happen for GET).');
  return new Response('Method Not Allowed', { status: 405 });
} 