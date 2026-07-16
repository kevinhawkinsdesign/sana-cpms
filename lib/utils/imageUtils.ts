// Utility functions for image handling in PDF generation

/**
 * Converts an image file to base64 string
 */
export const imageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Fetches an image from URL and converts to base64
 */
export const urlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting URL to base64:', error);
    throw error;
  }
};

/**
 * Pre-defined base64 images for PDF generation
 * These are the actual base64 encoded versions of the images
 */
export const PDF_IMAGES = {
  // Kabisa logo - you'll need to replace this with the actual base64 of your logo
  LOGO: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...', // Replace with actual base64
  
  // Phone icon - you'll need to replace this with the actual base64 of your phone icon
  PHONE: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...', // Replace with actual base64
};

/**
 * Loads images dynamically for PDF generation
 */
export const loadPDFImages = async () => {
  try {
    console.log('Loading logo...');
    // Load logo
    const logoBase64 = await urlToBase64('/kabisaa.png');
    console.log('Logo loaded');
    
    console.log('Loading phone icon...');
    // Load phone icon
    const phoneBase64 = await urlToBase64('/images/kabisaId/phone_yellow.png');
    console.log('Phone icon loaded');
    
    return {
      logo: logoBase64,
      phone: phoneBase64,
    };
  } catch (error) {
    console.error('Error loading PDF images:', error);
    // Return fallback images instead of throwing error
    console.log('Using fallback images...');
    return {
      logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 transparent PNG
      phone: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 transparent PNG
    };
  }
};
