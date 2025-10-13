import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L, { LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { reverseGeocode } from '@/utils/mapHelpers';

// Fix default icon issue with Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationMapProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
}

// Custom red marker icon
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapEventHandler({ 
  onLocationSelect 
}: { 
  onLocationSelect: (lat: number, lng: number, address: string) => void 
}) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      const address = await reverseGeocode(lat, lng);
      onLocationSelect(lat, lng, address);
    },
  });
  return null;
}

function CurrentLocationButton({ 
  onLocationFound 
}: { 
  onLocationFound: (lat: number, lng: number) => void 
}) {
  const map = useMap();

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.flyTo([latitude, longitude], 14);
          onLocationFound(latitude, longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  return (
    <div className="absolute top-4 right-4 z-[1000]">
      <Button onClick={getCurrentLocation} variant="outline" size="sm">
        Use Current Location
      </Button>
    </div>
  );
}

const LocationMap = ({ onLocationSelect, initialLat, initialLng }: LocationMapProps) => {
  const [markerPosition, setMarkerPosition] = useState<LatLngTuple | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );
  const markerRef = useRef<L.Marker>(null);

  const centerLat = initialLat || 28.6139;
  const centerLng = initialLng || 77.2090;
  const center: LatLngTuple = [centerLat, centerLng];

  const handleLocationFound = async (lat: number, lng: number) => {
    setMarkerPosition([lat, lng]);
    const address = await reverseGeocode(lat, lng);
    onLocationSelect(lat, lng, address);
  };

  const handleMarkerDragEnd = async () => {
    const marker = markerRef.current;
    if (marker != null) {
      const { lat, lng } = marker.getLatLng();
      setMarkerPosition([lat, lng]);
      const address = await reverseGeocode(lat, lng);
      onLocationSelect(lat, lng, address);
    }
  };

  useEffect(() => {
    if (initialLat && initialLng) {
      handleLocationFound(initialLat, initialLng);
    }
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Click on map or drag marker to select location</p>
      <div className="relative w-full h-[400px] rounded-lg border shadow-sm overflow-hidden">
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEventHandler onLocationSelect={onLocationSelect} />
          <CurrentLocationButton onLocationFound={handleLocationFound} />
          {markerPosition && (
            <Marker
              position={markerPosition}
              draggable={true}
              eventHandlers={{
                dragend: handleMarkerDragEnd,
              }}
              ref={markerRef}
              icon={redIcon}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default LocationMap;
