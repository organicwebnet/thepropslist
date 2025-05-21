# Ticketmaster API Integration Plan

**Feature Goal:** Allow users to search for events using the Ticketmaster Discovery API and auto-populate relevant fields in the "Add Show" form based on the selected event.

**Implementation Plan:**

1.  **Prerequisites:**
    *   **Obtain Ticketmaster API Key:** Register on the [Ticketmaster Developer Portal](https://developer.ticketmaster.com/) to get an API key.
    *   **API Key Security:**
        *   Store the API key securely using environment variables. Add `EXPO_PUBLIC_TICKETMASTER_API_KEY=YOUR_API_KEY_HERE` to your `.env` file.
        *   Add `EXPO_PUBLIC_TICKETMASTER_API_KEY=` to `.env.example`.
        *   Ensure `.env` is listed in `.gitignore`.
    *   **Review API Limits:** Understand the rate limits (default 5000 calls/day, 5/second) and response structure of the Discovery API.

2.  **Service Layer (`src/shared/services/external/ticketmaster.ts` or similar):**
    *   Create a new service file (or add to an existing external services file).
    *   Implement a function `searchTicketmasterEvents(query: string)`:
        *   Takes a search keyword as input.
        *   Constructs the URL for the `/discovery/v2/events` endpoint, including the API key from `process.env.EXPO_PUBLIC_TICKETMASTER_API_KEY` and the `keyword` parameter. Potentially add other relevant default filters like `countryCode`.
        *   Uses `fetch` (or a preferred HTTP client) to make the GET request.
        *   Handles the JSON response, extracting the `_embedded.events` array (or an empty array if no results).
        *   Includes basic error handling (network errors, non-200 status codes).
        *   Returns a promise resolving to an array of simplified event objects (e.g., `{ id: string, name: string, date: string, venueName: string }`).
    *   Implement a function `getTicketmasterEventDetails(eventId: string)`:
        *   Takes an event ID as input.
        *   Constructs the URL for the `/discovery/v2/events/{id}` endpoint, including the API key.
        *   Uses `fetch` to make the GET request.
        *   Handles the JSON response.
        *   Includes error handling.
        *   Returns a promise resolving to the detailed event object (or a refined version containing only the needed fields).

3.  **Frontend - "Add Show" Form Component (Identify the specific file, e.g., `src/components/shows/AddShowForm.tsx`):**
    *   **UI Changes:**
        *   Add a search input field (e.g., "Search Ticketmaster Event") and a search button near the top of the form or relevant section.
        *   Add state variables to manage:
            *   `searchQuery: string`
            *   `searchResults: Array<SimplifiedEvent>` (from `searchTicketmasterEvents`)
            *   `isLoading: boolean` (for search and detail fetching)
            *   `error: string | null` (for API errors/no results)
            *   `showResultsModal: boolean` (or similar mechanism to display results)
    *   **Search Interaction:**
        *   When the search button is clicked:
            *   Set `isLoading` to true, clear previous `searchResults` and `error`.
            *   Call `searchTicketmasterEvents(searchQuery)`.
            *   On success: Update `searchResults`, set `isLoading` false, set `showResultsModal` true. Handle the case where no results are returned (set `error` message).
            *   On failure: Set `error` message, set `isLoading` false.
    *   **Results Display:**
        *   Implement a modal or a dropdown list component (`SearchResultsList`) to display the `searchResults`.
        *   Each item in the list should be selectable (e.g., a button or touchable component) displaying key info (name, date, venue).
    *   **Selection & Population:**
        *   When a search result item is selected:
            *   Set `isLoading` true, close the results modal/list.
            *   Call `getTicketmasterEventDetails(selectedEventId)`.
            *   On success:
                *   Map the detailed event data (event name, dates, venue name, address, classifications, etc.) to the corresponding form state variables (using the `setFieldName` functions provided by the form's state management).
                *   Set `isLoading` false.
            *   On failure: Set `error` message ("Failed to fetch event details"), set `isLoading` false.
    *   **Loading/Error States:** Display appropriate loading indicators and error messages to the user during API calls.

4.  **Data Mapping:**
    *   Explicitly define the mapping between the fields returned by `getTicketmasterEventDetails` and the state setters for the form fields (as identified in the previous step). Handle potential missing data gracefully (e.g., fallback to empty strings or prompt user).

5.  **Testing:**
    *   **Unit Tests:** Test the `searchTicketmasterEvents` and `getTicketmasterEventDetails` service functions, mocking the `fetch` call and API responses (success and error cases).
    *   **Component Tests:** Test the "Add Show" form component, mocking the service functions to simulate search, selection, and population behavior.
    *   **Manual E2E:** Test the full flow with a valid API key: search for known events, select one, verify fields populate correctly, test error conditions (invalid search, API down simulation if possible). 