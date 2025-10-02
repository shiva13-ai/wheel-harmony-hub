import mapboxgl from 'mapbox-gl';

// Interpolate between two points for smooth marker movement
export const interpolateCoordinates = (
  start: [number, number],
  end: [number, number],
  factor: number
): [number, number] => {
  return [
    start[0] + (end[0] - start[0]) * factor,
    start[1] + (end[1] - start[1]) * factor,
  ];
};

// Animate marker movement smoothly
export const animateMarker = (
  marker: mapboxgl.Marker,
  fromLngLat: [number, number],
  toLngLat: [number, number],
  duration: number = 2000
) => {
  const startTime = Date.now();

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const factor = Math.min(elapsed / duration, 1);

    // Easing function for smooth movement
    const easedFactor = easeInOutQuad(factor);
    const currentLngLat = interpolateCoordinates(fromLngLat, toLngLat, easedFactor);

    marker.setLngLat(currentLngLat);

    if (factor < 1) {
      requestAnimationFrame(animate);
    }
  };

  animate();
};

// Easing function for smooth animations
const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

// Calculate distance between two coordinates in kilometers
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (degrees: number): number => {
  return (degrees * Math.PI) / 180;
};

// Fetch ETA from Mapbox Directions API
export const fetchETA = async (
  mapboxToken: string,
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number
): Promise<{ duration: number; distance: number } | null> => {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?access_token=${mapboxToken}&geometries=geojson`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        duration: route.duration, // in seconds
        distance: route.distance, // in meters
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching ETA:', error);
    return null;
  }
};

// Format seconds into human-readable time
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return '< 1 min';
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

// Format distance into human-readable format
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};
