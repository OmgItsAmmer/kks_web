import React, { useCallback, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { MapPin, Navigation, Loader2, Search } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import styles from './GoogleMapLocationPicker.module.css';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapLocationPickerProps {
  onLocationSelect: (location: {
    latitude: number;
    longitude: number;
    place_id?: string;
    formatted_address?: string;
    address_components?: any;
  }) => void;
  initialLocation?: { lat: number; lng: number };
  defaultCenter?: { lat: number; lng: number };
  height?: string;
  required?: boolean;
}

const defaultCenter = {
  lat: 24.8607, // Karachi, Pakistan
  lng: 67.0011,
};

// Component to handle map clicks
const MapClickHandler: React.FC<{
  onLocationChange: (lat: number, lng: number) => void;
}> = ({ onLocationChange }) => {
  useMapEvents({
    click: (e: L.LeafletMouseEvent) => {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  onLocationSelect,
  initialLocation,
  defaultCenter: propDefaultCenter,
  height = '400px',
  required = true,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    initialLocation || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const mapCenter = propDefaultCenter || defaultCenter;

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setSelectedLocation(location);
        reverseGeocode(location.lat, location.lng);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error getting location:', err);
        setError('Unable to get your location. Please select on map.');
        setIsLoading(false);
      }
    );
  }, []);

  // Reverse geocode coordinates to get address using LocationIQ
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    const apiKey = import.meta.env.VITE_LOCATIONIQ_API_KEY;
    if (!apiKey) {
      console.error('LocationIQ API key not found');
      return;
    }

    try {
      const response = await fetch(
        `https://us1.locationiq.com/v1/reverse?key=${apiKey}&lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        const formattedAddress = data.display_name || '';
        setAddress(formattedAddress);
        
        // Extract address components
        const addressComponents: any = {
          city: data.address?.city || data.address?.town || data.address?.village || '',
          state: data.address?.state || '',
          country: data.address?.country || 'Pakistan',
          postal_code: data.address?.postcode || '',
          locality: data.address?.suburb || data.address?.neighbourhood || '',
        };

        onLocationSelect({
          latitude: lat,
          longitude: lng,
          place_id: data.place_id?.toString(),
          formatted_address: formattedAddress,
          address_components: addressComponents,
        });
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  }, [onLocationSelect]);

  // Handle location change from map click
  const handleLocationChange = useCallback((lat: number, lng: number) => {
    const location = { lat, lng };
    setSelectedLocation(location);
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  // Search location using LocationIQ
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    const apiKey = import.meta.env.VITE_LOCATIONIQ_API_KEY;
    if (!apiKey) {
      setError('LocationIQ API key not configured');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://us1.locationiq.com/v1/search?key=${apiKey}&q=${encodeURIComponent(searchQuery)}&format=json&countrycodes=pk&limit=1&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          const result = data[0];
          const location = {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
          };
          setSelectedLocation(location);
          setAddress(result.display_name);
          
          const addressComponents: any = {
            city: result.address?.city || result.address?.town || result.address?.village || '',
            state: result.address?.state || '',
            country: result.address?.country || 'Pakistan',
            postal_code: result.address?.postcode || '',
            locality: result.address?.suburb || result.address?.neighbourhood || '',
          };

          onLocationSelect({
            latitude: location.lat,
            longitude: location.lng,
            place_id: result.place_id?.toString(),
            formatted_address: result.display_name,
            address_components: addressComponents,
          });
        } else {
          setError('Location not found. Try a different search term.');
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('Error searching location. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, onLocationSelect]);

  return (
    <div className={styles.mapContainer}>
      {/* Search Bar */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search for an address in Pakistan"
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          type="button"
          onClick={handleSearch}
          className={styles.searchBtn}
          disabled={isLoading || !searchQuery.trim()}
          title="Search"
        >
          <Search size={20} />
        </button>
        <button
          type="button"
          onClick={getCurrentLocation}
          className={styles.currentLocationBtn}
          disabled={isLoading}
          title="Use current location"
        >
          {isLoading ? (
            <Loader2 className={styles.spinner} size={20} />
          ) : (
            <Navigation size={20} />
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className={styles.errorMessage}>
          <p>{error}</p>
        </div>
      )}

      {/* Map */}
      <div className={styles.mapWrapper} style={{ height }}>
        <MapContainer
          center={[
            selectedLocation?.lat || mapCenter.lat,
            selectedLocation?.lng || mapCenter.lng
          ]}
          zoom={selectedLocation ? 16 : 12}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapClickHandler onLocationChange={handleLocationChange} />
          {selectedLocation && <Marker position={[selectedLocation.lat, selectedLocation.lng]} />}
        </MapContainer>
      </div>

      {/* Instructions */}
      <div className={styles.instructions}>
        <MapPin size={16} />
        <p>Click on the map or search to select your delivery location</p>
      </div>

      {/* Display selected address */}
      {address && (
        <div className={styles.selectedAddressBox}>
          <strong>Selected:</strong> {address}
        </div>
      )}

      {required && !selectedLocation && (
        <p className={styles.requiredText}>Please select a location on the map</p>
      )}
    </div>
  );
};

export default MapLocationPicker;
