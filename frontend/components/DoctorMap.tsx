import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React-Leaflet (will be called in component)
const fixLeafletIcons = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

// Custom doctor marker icon
const doctorIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#059669" stroke="#047857" stroke-width="2"/>
      <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// User location marker icon
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#2563eb" stroke="#1d4ed8" stroke-width="2"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  consultationFee: number;
  location: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  availability: {
    nextAvailable: string;
    isOnline: boolean;
  };
}

interface DoctorMapProps {
  doctors: Doctor[];
  userLocation?: {
    lat: number;
    lng: number;
  };
  onDoctorClick?: (doctor: Doctor) => void;
  className?: string;
}

// Component to automatically fit bounds when doctors change
const MapBoundsUpdater: React.FC<{ doctors: Doctor[], userLocation?: {lat: number, lng: number} }> = ({ 
  doctors, 
  userLocation 
}) => {
  const map = useMap();

  useEffect(() => {
    if (doctors.length === 0) return;

    const bounds = L.latLngBounds([]);
    
    // Add doctor locations to bounds
    doctors.forEach(doctor => {
      bounds.extend([doctor.location.coordinates.lat, doctor.location.coordinates.lng]);
    });
    
    // Add user location to bounds if available
    if (userLocation) {
      bounds.extend([userLocation.lat, userLocation.lng]);
    }

    // Fit map to bounds with padding
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [doctors, userLocation, map]);

  return null;
};

const DoctorMap: React.FC<DoctorMapProps> = ({ 
  doctors, 
  userLocation, 
  onDoctorClick,
  className = ""
}) => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    // Fix Leaflet icons when component mounts on client
    fixLeafletIcons();
  }, []);

  // Don't render on server side
  if (!isClient) {
    return (
      <div className={`h-96 w-full rounded-lg overflow-hidden shadow-lg bg-gray-100 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  // Default center (Mumbai, India) if no locations available
  const defaultCenter: LatLngExpression = [19.0760, 72.8777];
  
  // Determine initial center
  const center: LatLngExpression = userLocation 
    ? [userLocation.lat, userLocation.lng]
    : doctors.length > 0 
      ? [doctors[0].location.coordinates.lat, doctors[0].location.coordinates.lng]
      : defaultCenter;

  return (
    <div className={`h-96 w-full rounded-lg overflow-hidden shadow-lg ${className}`}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        {/* Free OpenStreetMap tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* User location marker */}
        {userLocation && (
          <Marker 
            position={[userLocation.lat, userLocation.lng]} 
            icon={userIcon}
          >
            <Popup>
              <div className="text-center">
                <strong>📍 Your Location</strong>
                <br />
                <span className="text-sm text-gray-600">
                  Current position
                </span>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Doctor markers */}
        {doctors.map((doctor) => (
          <Marker
            key={doctor.id}
            position={[doctor.location.coordinates.lat, doctor.location.coordinates.lng]}
            icon={doctorIcon}
            eventHandlers={{
              click: () => onDoctorClick?.(doctor),
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <div className="font-semibold text-lg text-gray-900">{doctor.name}</div>
                <div className="text-sm text-gray-600 mb-2">{doctor.specialization}</div>
                
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <span className="text-yellow-500">★</span>
                    <span className="ml-1 text-sm font-medium">{doctor.rating}</span>
                  </div>
                  <div className="text-sm font-semibold text-green-600">
                    ₹{doctor.consultationFee}
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-3">
                  📍 {doctor.location.address}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className={`px-2 py-1 rounded-full ${
                    doctor.availability.isOnline 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {doctor.availability.isOnline ? '🟢 Online' : '📅 In-person'}
                  </span>
                  <span className="text-gray-600">
                    Next: {doctor.availability.nextAvailable}
                  </span>
                </div>

                {onDoctorClick && (
                  <button
                    onClick={() => onDoctorClick(doctor)}
                    className="w-full mt-3 bg-blue-600 text-white text-sm py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Book Appointment
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        
        {/* Auto-fit bounds when data changes */}
        <MapBoundsUpdater doctors={doctors} userLocation={userLocation} />
      </MapContainer>
    </div>
  );
};

export default DoctorMap; 