import React, { useCallback, useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
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

// Component to update map center when location changes
const MapCenterUpdater: React.FC<{
  center: [number, number];
  zoom: number;
}> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
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
  const mapCenter = propDefaultCenter || defaultCenter;

  // Reverse geocode coordinates to get address using LocationIQ (high precision)
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    const apiKey = import.meta.env.VITE_LOCATIONIQ_API_KEY;
    if (!apiKey) {
      console.error('LocationIQ API key not found');
      return;
    }

    try {
      // Use zoom=18 for maximum precision (building level)
      // normalizedcoordinates=1 for better address matching
      const response = await fetch(
        `https://us1.locationiq.com/v1/reverse?key=${apiKey}&lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18&normalizecoordinates=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Build precise address from components
        const addr = data.address || {};
        let formattedAddress = '';
        
        // Try to get the most specific address possible
        if (addr.house_number || addr.house_name) {
          formattedAddress = `${addr.house_number || addr.house_name || ''} ${addr.road || addr.street || ''}`.trim();
        }
        if (addr.road || addr.street) {
          formattedAddress = formattedAddress || (addr.road || addr.street || '');
        }
        if (addr.neighbourhood || addr.suburb) {
          formattedAddress += formattedAddress ? `, ${addr.neighbourhood || addr.suburb}` : (addr.neighbourhood || addr.suburb);
        }
        if (addr.locality || addr.city || addr.town || addr.village) {
          formattedAddress += formattedAddress ? `, ${addr.locality || addr.city || addr.town || addr.village}` : (addr.locality || addr.city || addr.town || addr.village);
        }
        if (addr.postcode) {
          formattedAddress += formattedAddress ? ` ${addr.postcode}` : addr.postcode;
        }
        
        // Fallback to display_name if our building is empty
        formattedAddress = formattedAddress || data.display_name || '';
        
        setAddress(formattedAddress);
        
        // Extract address components with more detail
        const addressComponents: any = {
          house_number: addr.house_number || '',
          house_name: addr.house_name || '',
          road: addr.road || addr.street || '',
          neighbourhood: addr.neighbourhood || addr.suburb || '',
          city: addr.city || addr.town || addr.village || addr.locality || '',
          state: addr.state || '',
          country: addr.country || 'Pakistan',
          postal_code: addr.postcode || '',
          locality: addr.locality || addr.suburb || addr.neighbourhood || '',
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

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    // Clear any previous errors immediately and start loading
    setError(null);
    setIsLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setSelectedLocation(location);
          
          // Wait for reverse geocoding to complete before hiding loader
          await reverseGeocode(location.lat, location.lng);
          
          // Only set loading to false after everything is done
          setIsLoading(false);
          setError(null); // Ensure error is cleared on success
        } catch (error) {
          console.error('Error in location processing:', error);
          setError('Error getting address for this location.');
          setIsLoading(false);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        let errorMessage = 'Unable to get your location. Please select on map.';
        
        // Provide more specific error messages
        if (err.code === 1) {
          errorMessage = 'Location access denied. Please allow location access and try again.';
        } else if (err.code === 2) {
          errorMessage = 'Location unavailable. Please check your device settings.';
        } else if (err.code === 3) {
          errorMessage = 'Location request timed out. Please try again.';
        }
        
        setError(errorMessage);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout to 15 seconds
        maximumAge: 0,
      }
    );
  }, [reverseGeocode]);

  // Handle location change from map click
  const handleLocationChange = useCallback((lat: number, lng: number) => {
    // Clear error when user manually selects location
    setError(null);
    const location = { lat, lng };
    setSelectedLocation(location);
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  // Update map center when location changes
  useEffect(() => {
    if (selectedLocation) {
      // MapCenterUpdater component will handle the view change
    }
  }, [selectedLocation]);

  return (
    <div className={styles.mapContainer}>
      {/* Current Location Button */}
      <div className={styles.buttonContainer}>
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
          <span>Use Current Location</span>
        </button>
      </div>

       {/* Error Message - only show when not loading */}
      {error && !isLoading && (
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
          zoom={selectedLocation ? 18 : 12}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom={true}
          key={`${selectedLocation?.lat}-${selectedLocation?.lng}`}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapClickHandler onLocationChange={handleLocationChange} />
          {selectedLocation && (
            <>
              <MapCenterUpdater center={[selectedLocation.lat, selectedLocation.lng]} zoom={18} />
              <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
            </>
          )}
        </MapContainer>
      </div>

      {/* Instructions */}
      <div className={styles.instructions}>
        <MapPin size={16} />
        <p>Click on the map or use current location to select your delivery location</p>
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
