const MISSING_KEYS = new Set([
  '',
  'Paste-Key-Here',
  '__WRENCHIT_FRONTEND_GOOGLE_MAPS_API_KEY__',
]);

function normalizeApiKey(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return MISSING_KEYS.has(trimmed) ? '' : trimmed;
}

export function resolveMapsApiKey() {
  const fromRuntime = normalizeApiKey(window.WRENCHIT_CONFIG?.googleMapsApiKey);
  if (fromRuntime) return fromRuntime;

  const fromVite = normalizeApiKey(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  if (fromVite) return fromVite;

  return '';
}

export async function loadGoogleMaps(apiKey) {
  if (window.google?.maps) return;
  if (!apiKey) throw new Error('Google Maps API key is missing.');

  if (!window.__wrenchitGoogleMapsLoader) {
    // Reuse one shared loader promise so repeated map pages do not inject the script twice.
    window.__wrenchitGoogleMapsLoader = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Google Maps script.'));
      document.head.appendChild(script);
    });
  }

  await window.__wrenchitGoogleMapsLoader;
}
