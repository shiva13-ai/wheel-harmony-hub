import L from 'leaflet';

// Animate marker smoothly between positions
export const animateMarker = (
  marker: L.Marker,
  start: [number, number],
  end: [number, number],
  duration: number
) => {
  const startTime = Date.now();
  const startLat = start[1];
  const startLng = start[0];
  const endLat = end[1];
  const endLng = end[0];

  const animate = () => {
    const now = Date.now();
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function for smooth animation
    const easeProgress = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    const currentLat = startLat + (endLat - startLat) * easeProgress;
    const currentLng = startLng + (endLng - startLng) * easeProgress;

    marker.setLatLng([currentLat, currentLng]);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  requestAnimationFrame(animate);
};

// Fetch ETA using OSRM (Open Source Routing Machine)
export const fetchETA = async (
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number
): Promise<{ duration: number; distance: number } | null> => {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch route');
    }

    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      return {
        duration: data.routes[0].duration, // in seconds
        distance: data.routes[0].distance, // in meters
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching ETA:', error);
    return null;
  }
};

// Format duration in seconds to readable string
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};

// Format distance in meters to readable string
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  } else {
    return `${(meters / 1000).toFixed(1)} km`;
  }
};

// Reverse geocode using Nominatim (OpenStreetMap)
export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to geocode');
    }

    const data = await response.json();
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
};
