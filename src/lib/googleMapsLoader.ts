// Google Maps API Loader - Single source of truth for loading the API
let isLoaded = false;
let isLoading = false;
let loadPromise: Promise<typeof google> | null = null;

export const loadGoogleMapsAPI = (apiKey: string): Promise<typeof google> => {
  // Return existing promise if already loading
  if (isLoading && loadPromise) {
    return loadPromise;
  }

  // Return resolved promise if already loaded
  if (isLoaded && window.google) {
    return Promise.resolve(window.google);
  }

  // Start loading
  isLoading = true;
  loadPromise = new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    );

    if (existingScript && window.google) {
      isLoaded = true;
      isLoading = false;
      resolve(window.google);
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      isLoaded = true;
      isLoading = false;
      if (window.google) {
        resolve(window.google);
      } else {
        reject(new Error('Google Maps API loaded but google object not found'));
      }
    };

    script.onerror = () => {
      isLoading = false;
      loadPromise = null;
      reject(new Error('Failed to load Google Maps API'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
};

// TypeScript declaration for google global
declare global {
  interface Window {
    google: typeof google;
  }
}
