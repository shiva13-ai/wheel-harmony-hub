import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface LocationMapProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
}

const LocationMap = ({ onLocationSelect, initialLat, initialLng }: LocationMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState(localStorage.getItem('mapbox_token') || '');
  const [tokenSet, setTokenSet] = useState(!!localStorage.getItem('mapbox_token'));

  const handleTokenSubmit = () => {
    localStorage.setItem('mapbox_token', mapboxToken);
    setTokenSet(true);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (map.current) {
            map.current.flyTo({ center: [longitude, latitude], zoom: 14 });
            updateMarker(latitude, longitude);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const updateMarker = async (lat: number, lng: number) => {
    if (marker.current) {
      marker.current.setLngLat([lng, lat]);
    } else if (map.current) {
      marker.current = new mapboxgl.Marker({ draggable: true, color: '#ef4444' })
        .setLngLat([lng, lat])
        .addTo(map.current);

      marker.current.on('dragend', () => {
        const lngLat = marker.current!.getLngLat();
        reverseGeocode(lngLat.lat, lngLat.lng);
      });
    }

    await reverseGeocode(lat, lng);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}`
      );
      const data = await response.json();
      const address = data.features[0]?.place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      onLocationSelect(lat, lng, address);
    } catch (error) {
      console.error('Geocoding error:', error);
      onLocationSelect(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  };

  useEffect(() => {
    if (!mapContainer.current || !tokenSet || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    const centerLat = initialLat || 28.6139;
    const centerLng = initialLng || 77.2090;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [centerLng, centerLat],
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('click', (e) => {
      updateMarker(e.lngLat.lat, e.lngLat.lng);
    });

    if (initialLat && initialLng) {
      updateMarker(initialLat, initialLng);
    }

    return () => {
      map.current?.remove();
    };
  }, [tokenSet, mapboxToken]);

  if (!tokenSet) {
    return (
      <div className="space-y-4 p-6 border rounded-lg bg-card">
        <div className="space-y-2">
          <Label htmlFor="mapbox-token">Mapbox Access Token</Label>
          <p className="text-sm text-muted-foreground">
            Get your token from{' '}
            <a
              href="https://account.mapbox.com/access-tokens/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Mapbox Dashboard
            </a>
          </p>
          <Input
            id="mapbox-token"
            type="text"
            value={mapboxToken}
            onChange={(e) => setMapboxToken(e.target.value)}
            placeholder="pk.eyJ1..."
          />
        </div>
        <Button onClick={handleTokenSubmit} disabled={!mapboxToken}>
          Set Token & Load Map
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Click on map or drag marker to select location</p>
        <Button onClick={getCurrentLocation} variant="outline" size="sm">
          Use Current Location
        </Button>
      </div>
      <div ref={mapContainer} className="w-full h-[400px] rounded-lg border shadow-sm" />
    </div>
  );
};

export default LocationMap;
