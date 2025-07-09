import { TicketmasterEvent, TicketmasterEventSearchResponse, TicketmasterSimplifiedEvent } from '../../types/ticketmaster.ts';

/**
 * Searches for events by calling our backend API route.
 * @param query The search keyword.
 * @returns A promise resolving to an array of simplified event objects.
 */
export const searchTicketmasterEvents = async (query: string): Promise<TicketmasterSimplifiedEvent[]> => {
    const url = `/server_routes/ticketmaster/search?query=${encodeURIComponent(query)}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `API route error: ${response.statusText}` })); 
            throw new Error(errorData.error || `Failed to search Ticketmaster events via API route.`);
        }
        const data: TicketmasterEventSearchResponse = await response.json(); 
        if (!data._embedded?.events) {
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
    const API_KEY = process.env.EXPO_PUBLIC_TICKETMASTER_API_KEY;
    const BASE_URL = 'https://app.ticketmaster.com/discovery/v2';
    if (!API_KEY) {
        throw new Error('Ticketmaster API key is missing.');
    }
    const url = `${BASE_URL}/events/${eventId}.json?apikey=${API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch event details: ${response.statusText}`);
        }
        const data: TicketmasterEvent = await response.json();
        return data;
    } catch (error) {
        throw error instanceof Error ? error : new Error('An unknown error occurred fetching event details');
    }
}; 
