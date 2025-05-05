import { TicketmasterEvent, TicketmasterEventSearchResponse, TicketmasterSimplifiedEvent } from '../../types/ticketmaster';

/**
 * Searches for events by calling our backend API route.
 * @param query The search keyword.
 * @returns A promise resolving to an array of simplified event objects.
 */
export const searchTicketmasterEvents = async (query: string): Promise<TicketmasterSimplifiedEvent[]> => {
    // Call our local API route (renamed directory)
    const url = `/server_routes/ticketmaster/search?query=${encodeURIComponent(query)}`; // Updated path
    // const url = `/api/hello`; // <-- TEMPORARY CHANGE FOR DEBUGGING
    console.log(`[Service] Calling local API route: ${url}`); // Updated log message

    try {
        // Fetch from our own backend
        const response = await fetch(url);
        // Remove debug logs for /api/hello
        // console.log(`[Service - DEBUG /api/hello] Response Status: ${response.status}`);
        // const responseText = await response.text(); 
        // console.log(`[Service - DEBUG /api/hello] Response Text:`, responseText);

        if (!response.ok) {
            // Restore original error handling
            const errorData = await response.json().catch(() => ({ error: `API route error: ${response.statusText}` })); 
            console.error(`[Service] API route error (${response.status}):`, errorData.error);
            throw new Error(errorData.error || `Failed to search Ticketmaster events via API route.`);
        }
        
        // Restore original JSON parsing and data extraction
        const data: TicketmasterEventSearchResponse = await response.json(); 
        console.log(`[Service] Received data from API route for query "${query}"`);

        // --- Restore original mapping logic --- 
        if (!data._embedded?.events) {
            console.log('[Service] No events found in the response from API route.');
            return [];
        }
        const simplifiedEvents: TicketmasterSimplifiedEvent[] = data._embedded.events.map((event: TicketmasterEvent) => ({
            id: event.id,
            name: event.name,
            date: event.dates?.start?.localDate || 'Date TBD',
            venueName: event._embedded?.venues?.[0]?.name || 'Venue TBD'
        }));
        return simplifiedEvents;
        
    } catch (error) {
        console.error('[Service] Error calling search API route:', error);
        throw error instanceof Error ? error : new Error('An unknown error occurred during search');
    }
};

/**
 * Gets details for a specific Ticketmaster event.
 * TODO: Update this to call a backend API route similar to search.
 * @param eventId The Ticketmaster event ID.
 * @returns A promise resolving to the full event detail object.
 */
export const getTicketmasterEventDetails = async (eventId: string): Promise<TicketmasterEvent> => {
    // !!! IMPORTANT: This still calls Ticketmaster directly and WILL likely cause CORS errors !!!
    // !!! Need to create /api/ticketmaster/details route and update this fetch call !!!
    console.warn('[Service] getTicketmasterEventDetails is calling Ticketmaster API directly! Needs backend proxy.');
    const API_KEY = process.env.EXPO_PUBLIC_TICKETMASTER_API_KEY; // Keep temporarily for direct call
    const BASE_URL = 'https://app.ticketmaster.com/discovery/v2'; // Keep temporarily

    if (!API_KEY) {
        console.error('Ticketmaster API key is missing.');
        throw new Error('Ticketmaster API key is missing.');
    }

    const url = `${BASE_URL}/events/${eventId}.json?apikey=${API_KEY}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Ticketmaster API error: ${response.status} - ${response.statusText}`);
            throw new Error(`Failed to fetch event details: ${response.statusText}`);
        }
        const data: TicketmasterEvent = await response.json();
        return data;

    } catch (error) {
        console.error('Error fetching Ticketmaster event details:', error);
        throw error instanceof Error ? error : new Error('An unknown error occurred fetching event details');
    }
}; 