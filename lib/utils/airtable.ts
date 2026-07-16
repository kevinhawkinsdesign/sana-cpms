// Airtable form URL utilities

export const AIRTABLE_FORMS = {
  TEST_DRIVE: 'https://airtable.com/embed/appcxJlWp5SUD3aUU/pag0abXrye6lVh9bx/form',
  PRICE_REQUEST: 'https://airtable.com/embed/appcxJlWp5SUD3aUU/pagGTtTDNoKlVA5bS/form', // Using same form, can be updated to dedicated form later
  CONTACT: 'https://airtable.com/embed/appcxJlWp5SUD3aUU/pagyPoM3W9Ps4WozT/form',
  FINANCING: 'https://airtable.com/embed/appcxJlWp5SUD3aUU/pagS6NVCrDHzJNnfD/form',
  MAINTENANCE: 'https://airtable.com/embed/appcxJlWp5SUD3aUU/pagBq1fiDrQN30XyU/form',
  CHARGER_INSTALLATION: 'https://airtable.com/appwFmocJeB0pklLN/pag7tAzHLVQdEali6/form',
  OFFICE_VISITOR: 'https://airtable.com/appcxJlWp5SUD3aUU/pagBq1fiDrQN30XyU/form'
} as const;

// Field names for prefilling (these need to match exactly with Airtable form field names)
export const AIRTABLE_FIELDS = {
  TEST_DRIVE_VEHICLE: 'Which vehicle do you want to test drive? Do you have a date and time you prefer for the test drive?',
  PRICE_REQUEST_VEHICLE: 'Which vehicle do you want to test drive? Do you have a date and time you prefer for the test drive?', // Using same field, can be updated to dedicated field later
  CONTACT_SUBJECT: 'Subject',
  CONTACT_MESSAGE: 'Message',
  FINANCING_VEHICLE: 'Which vehicle are you interested in?',
  MAINTENANCE_VEHICLE: 'Vehicle Information',
  CHARGER_LOCATION: 'Installation Location',
  VISITOR_PURPOSE: 'Visit Purpose'
} as const;

/**
 * Creates an Airtable form URL with prefilled data
 * @param formType - The type of Airtable form
 * @param prefilledData - Object with field names as keys and values to prefill
 * @returns Complete Airtable form URL with prefilled data
 */
export function createAirtableFormUrl(
  formType: keyof typeof AIRTABLE_FORMS,
  prefilledData: Record<string, string> = {}
): string {
  const baseUrl = AIRTABLE_FORMS[formType];
  
  if (Object.keys(prefilledData).length === 0) {
    return baseUrl;
  }

  const params = new URLSearchParams();
  
  Object.entries(prefilledData).forEach(([fieldName, value]) => {
    if (value && value.trim()) {
      params.append(`prefill_${encodeURIComponent(fieldName)}`, value);
    }
  });

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Creates a test drive form URL with vehicle information prefilled
 * @param vehicleName - The vehicle name to prefill (e.g., "2025 BYD Yuan Up")
 * @param country - The country code (e.g., "RW", "KE")
 * @param additionalInfo - Additional vehicle information to prefill
 * @returns Complete Airtable test drive form URL
 */
export function createTestDriveFormUrl(
  vehicleName: string, 
  country?: string, 
  additionalInfo?: Record<string, string>
): string {
  const prefilledData: Record<string, string> = {
    [AIRTABLE_FIELDS.TEST_DRIVE_VEHICLE]: vehicleName
  };

  // Add country if provided
  if (country) {
    prefilledData['Country'] = country;
  }

  // Add any additional information
  if (additionalInfo) {
    Object.assign(prefilledData, additionalInfo);
  }

  return createAirtableFormUrl('TEST_DRIVE', prefilledData);
}

/**
 * Opens an Airtable form in a new tab with prefilled data
 * @param formType - The type of Airtable form
 * @param prefilledData - Object with field names as keys and values to prefill
 */
export function openAirtableForm(
  formType: keyof typeof AIRTABLE_FORMS,
  prefilledData: Record<string, string> = {}
): void {
  const url = createAirtableFormUrl(formType, prefilledData);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Opens a test drive form in a new tab with vehicle information prefilled
 * @param vehicleName - The vehicle name to prefill
 * @param country - The country code (e.g., "RW", "KE")
 * @param additionalInfo - Additional vehicle information to prefill
 */
export function openTestDriveForm(
  vehicleName: string, 
  country?: string, 
  additionalInfo?: Record<string, string>
): void {
  const url = createTestDriveFormUrl(vehicleName, country, additionalInfo);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Creates a price request form URL with vehicle information prefilled
 * @param vehicleName - The vehicle name to prefill (e.g., "2025 BYD Yuan Up")
 * @param country - The country code (e.g., "RW", "KE")
 * @param additionalInfo - Additional vehicle information to prefill
 * @returns Complete Airtable price request form URL
 */
export function createPriceRequestFormUrl(
  vehicleName: string, 
  country?: string, 
  additionalInfo?: Record<string, string>
): string {
  const prefilledData: Record<string, string> = {
    [AIRTABLE_FIELDS.PRICE_REQUEST_VEHICLE]: `Price Request: ${vehicleName}`
  };

  // Add country if provided
  if (country) {
    prefilledData['Country'] = country;
  }

  // Add any additional information
  if (additionalInfo) {
    Object.assign(prefilledData, additionalInfo);
  }

  return createAirtableFormUrl('PRICE_REQUEST', prefilledData);
}

/**
 * Opens a price request form in a new tab with vehicle information prefilled
 * @param vehicleName - The vehicle name to prefill
 * @param country - The country code (e.g., "RW", "KE")
 * @param additionalInfo - Additional vehicle information to prefill
 */
export function openPriceRequestForm(
  vehicleName: string, 
  country?: string, 
  additionalInfo?: Record<string, string>
): void {
  const url = createPriceRequestFormUrl(vehicleName, country, additionalInfo);
  window.open(url, '_blank', 'noopener,noreferrer');
}
