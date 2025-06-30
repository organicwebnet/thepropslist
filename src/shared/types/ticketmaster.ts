// Based on Ticketmaster Discovery API v2 response structure
// Note: This is not exhaustive, add properties as needed.

export interface TicketmasterImage {
    ratio?: string; // e.g., "16_9"
    url: string;
    width: number;
    height: number;
    fallback: boolean;
}

export interface TicketmasterDateInfo {
    localDate?: string; // YYYY-MM-DD
    localTime?: string; // HH:MM:SS
    dateTime?: string; // ISO 8601 format
    dateTBD?: boolean;
    dateTBA?: boolean;
    timeTBA?: boolean;
    noSpecificTime?: boolean;
}

export interface TicketmasterDate {
    start?: TicketmasterDateInfo;
    end?: TicketmasterDateInfo;
    timezone?: string;
    status?: {
        code?: string; // e.g., "onsale", "offsale", "canceled"
    };
    spanMultipleDays?: boolean;
}

export interface TicketmasterClassificationInfo {
    id: string;
    name: string;
}

export interface TicketmasterClassification {
    primary?: boolean;
    segment?: TicketmasterClassificationInfo;
    genre?: TicketmasterClassificationInfo;
    subGenre?: TicketmasterClassificationInfo;
    type?: TicketmasterClassificationInfo;
    subType?: TicketmasterClassificationInfo;
    family?: boolean;
}

export interface TicketmasterAddress {
    line1?: string;
    line2?: string;
    line3?: string;
}

export interface TicketmasterLocation {
    longitude?: string; // Note: API docs say number, but examples show string
    latitude?: string; // Note: API docs say number, but examples show string
}

export interface TicketmasterVenue {
    id: string;
    name: string;
    type: string;
    locale?: string;
    url?: string;
    postalCode?: string;
    timezone?: string;
    city?: { name?: string };
    state?: { name?: string; stateCode?: string };
    country?: { name?: string; countryCode?: string };
    address?: TicketmasterAddress;
    location?: TicketmasterLocation;
    markets?: Array<{ id?: string; name?: string }>;
    dmas?: Array<{ id?: number }>;
    boxOfficeInfo?: {
        phoneNumberDetail?: string;
        openHoursDetail?: string;
        acceptedPaymentDetail?: string;
        willCallDetail?: string;
    };
    parkingDetail?: string;
    accessibleSeatingDetail?: string;
    generalInfo?: {
        generalRule?: string;
        childRule?: string;
    };
    images?: TicketmasterImage[];
    // ... other venue properties
}

export interface TicketmasterAttraction {
    id: string;
    name: string;
    type: string;
    locale?: string;
    url?: string;
    images?: TicketmasterImage[];
    classifications?: TicketmasterClassification[];
    // ... other attraction properties
}

export interface TicketmasterPriceRange {
    type?: string;
    currency?: string;
    min?: number;
    max?: number;
}

export interface TicketmasterSalesInfo {
    public?: {
        startDateTime?: string;
        startTBD?: boolean;
        endDateTime?: string;
    };
    presales?: Array<{
        startDateTime?: string;
        endDateTime?: string;
        name?: string;
        description?: string;
        url?: string;
    }>;
}

export interface TicketmasterEvent {
    id: string;
    name: string;
    type: string;
    locale?: string;
    url?: string;
    images?: TicketmasterImage[];
    dates?: TicketmasterDate;
    sales?: TicketmasterSalesInfo;
    classifications?: TicketmasterClassification[];
    promoter?: { id?: string; name?: string; description?: string };
    promoters?: Array<{ id?: string; name?: string; description?: string }>;
    priceRanges?: TicketmasterPriceRange[];
    seatmap?: { staticUrl?: string };
    accessibility?: { info?: string };
    ticketLimit?: { info?: string };
    info?: string;
    pleaseNote?: string;
    _embedded?: {
        venues?: TicketmasterVenue[];
        attractions?: TicketmasterAttraction[];
    };
    // ... other event properties
}

// For the search results list display
export interface TicketmasterSimplifiedEvent {
    id: string;
    name: string;
    date: string; // YYYY-MM-DD or 'N/A'
    venueName: string; // or 'N/A'
}

// For the overall search response structure
export interface TicketmasterEventSearchResponse {
    _embedded?: {
        events: TicketmasterEvent[];
    };
    page?: {
        size: number;
        totalElements: number;
        totalPages: number;
        number: number;
    };
    _links?: {
        // HATEOAS links if needed
    };
} 
