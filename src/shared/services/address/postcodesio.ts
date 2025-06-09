/**
 * Service for interacting with the postcodes.io API.
 * @see https://postcodes.io/
 */

const API_BASE_URL = 'https://api.postcodes.io';

interface ValidatePostcodeResponse {
  status: number;
  result: boolean;
  error?: string;
}

/**
 * Validates a UK postcode.
 * @param postcode The postcode to validate.
 * @returns True if the postcode is valid, false otherwise.
 */
export const validateUkPostcode = async (postcode: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/postcodes/${encodeURIComponent(postcode)}/validate`);
    if (!response.ok) {
      if (response.status === 404) {
        return false; 
      }
      return false;
    }
    const data: ValidatePostcodeResponse = await response.json();
    return data.result;
  } catch (error) {
    return false;
  }
};

interface PostcodeLookupResult {
  postcode: string;
  quality: number;
  eastings: number;
  northings: number;
  country: string;
  nhs_ha: string;
  longitude: number;
  latitude: number;
  european_electoral_region: string;
  primary_care_trust: string;
  region: string;
  lsoa: string;
  msoa: string;
  incode: string;
  outcode: string;
  parliamentary_constituency: string;
  admin_district: string;
  parish: string;
  admin_county: string | null;
  admin_ward: string;
  ced: string | null;
  ccg: string;
  nuts: string;
  codes: {
    admin_district: string;
    admin_county: string;
    admin_ward: string;
    parish: string;
    parliamentary_constituency: string;
    ccg: string;
    ccg_id: string;
    ced: string;
    nuts: string;
    lsoa: string;
    msoa: string;
    lau2: string;
  };
  // Note: The API can return other address components like street, etc., but they are not guaranteed
  // and often not present at the postcode level alone. For full address lookup, 
  // a more specific address lookup service (often paid) is typically needed after postcode validation.
  // For now, we'll focus on what postcodes.io directly provides for a postcode.
  // We might get `admin_district` or `parish` which could be useful for City/Town.
}

interface PostcodeLookupResponse {
  status: number;
  result: PostcodeLookupResult | null; // Result can be null if postcode is not found
  error?: string;
}

/**
 * Looks up a UK postcode to get more details.
 * @param postcode The postcode to lookup.
 * @returns A PostcodeLookupResult object if found, or null otherwise.
 */
export const lookupUkPostcode = async (postcode: string): Promise<PostcodeLookupResult | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/postcodes/${encodeURIComponent(postcode)}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      return null;
    }
    const data: PostcodeLookupResponse = await response.json();
    if (data.status === 200 && data.result) {
      return data.result;
    }
    return null;
  } catch (error) {
    return null;
  }
};

// We can add the lookup function next. 