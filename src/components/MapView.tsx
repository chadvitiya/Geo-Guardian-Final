import React, { useRef, useEffect, useState } from 'react';
import Map, { Marker, Popup, NavigationControl, GeolocateControl, ScaleControl, FullscreenControl } from 'react-map-gl';
import { MapPin, Car, Battery, Zap, Shield, User, Clock, Wifi, WifiOff, Target } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

interface LocationData {
  latitude: number;
  longitude: number;
  speed: number;
  battery: number;
  isDriving: boolean;
  lastUpdated: Date;
  accuracy: number;
  heading?: number | null;
  altitude?: number | null;
}

interface Member {
  id: string;
  name: string;
  profilePicture?: string;
  location: LocationData;
  lastSeen: string;
  safetyScore: number;
  totalRewards: number;
  isOnline: boolean;
}

interface MapViewProps {
  members: Member[];
  currentLocation: LocationData | null;
  isLocationSharing: boolean;
}

const MapView: React.FC<MapViewProps> = ({ members, currentLocation, isLocationSharing }) => {
  const mapRef = useRef<any>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v12');
  const [viewState, setViewState] = useState({
    longitude: -74.006,
    latitude: 40.7128,
    zoom: 12
  });

  // Update map center when current location is available
  useEffect(() => {
    if (currentLocation && isLocationSharing) {
      setViewState(prev => ({
        ...prev,
        longitude: currentLocation.longitude,
        latitude: currentLocation.latitude,
        zoom: Math.max(prev.zoom, 16) // Higher minimum zoom for better accuracy
      }));
    }
  }, [currentLocation, isLocationSharing]);

  const getBatteryColor = (battery: number) => {
    if (battery > 60) return 'text-green-500';
    if (battery > 30) return 'text-yellow-500';
    if (battery > 15) return 'text-orange-500';
    return 'text-red-500';
  };

  const getBatteryBgColor = (battery: number) => {
    if (battery > 60) return 'bg-green-500';
    if (battery > 30) return 'bg-yellow-500';
    if (battery > 15) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getSpeedColor = (speed: number) => {
    if (speed === 0) return 'text-slate-400';
    if (speed <= 65) return 'text-green-500';
    if (speed <= 75) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy <= 5) return 'text-green-500';
    if (accuracy <= 15) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getMarkerColor = (member: Member, isCurrentUser: boolean) => {
    if (isCurrentUser) return '#8b5cf6'; // Purple for current user
    if (!member.isOnline) return '#64748b'; // Gray for offline
    if (member.location.isDriving) return '#eab308'; // Yellow for driving
    return '#22c55e'; // Green for stationary
  };

  const getAccuracyRadius = (accuracy: number, zoom: number) => {
    // Convert GPS accuracy (meters) to pixels based on zoom level
    const metersPerPixel = 156543.03392 * Math.cos(currentLocation?.latitude || 0 * Math.PI / 180) / Math.pow(2, zoom);
    return Math.max(8, Math.min(50, accuracy / metersPerPixel)); // Min 8px, max 50px
  };

  const CustomMarker: React.FC<{ member: Member; isCurrentUser: boolean }> = ({ member, isCurrentUser }) => {
    const color = getMarkerColor(member, isCurrentUser);
    const isOffline = !member.isOnline;
    
    return (
      <div className="relative">
        {/* Accuracy circle for current user */}
        {isCurrentUser && currentLocation && (
          <div 
            className="absolute rounded-full border-2 border-purple-300 bg-purple-100 opacity-20"
            style={{
              width: `${getAccuracyRadius(currentLocation.accuracy, viewState.zoom) * 2}px`,
              height: `${getAccuracyRadius(currentLocation.accuracy, viewState.zoom) * 2}px`,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}
        
        {/* Pulse animation for current user */}
        {isCurrentUser && !isOffline && (
          <div 
            className="absolute inset-0 rounded-full animate-ping"
            style={{ backgroundColor: color, opacity: 0.4 }}
          />
        )}
        
        {/* Main marker with profile picture */}
        <div 
          className={`w-12 h-12 rounded-full border-3 border-white shadow-xl flex items-center justify-center cursor-pointer transform hover:scale-110 transition-all duration-200 overflow-hidden ${
            isOffline ? 'opacity-60' : ''
          }`}
          style={{ backgroundColor: color }}
          onClick={() => setSelectedMember(member)}
        >
          {member.profilePicture ? (
            <img 
              src={member.profilePicture} 
              alt={member.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {isCurrentUser ? (
                <User size={20} className="text-white" />
              ) : member.location.isDriving ? (
                <Car size={20} className="text-white" />
              ) : (
                <div className="w-4 h-4 bg-white rounded-full" />
              )}
            </div>
          )}
        </div>
        
        {/* Speed indicator for moving members */}
        {member.location.isDriving && member.location.speed > 5 && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-pulse flex items-center justify-center shadow-lg">
            <span className="text-white text-xs font-bold">{Math.round(member.location.speed / 10)}</span>
          </div>
        )}
        
        {/* Enhanced battery indicator */}
        <div className="absolute -bottom-2 -right-2 w-6 h-4 bg-white rounded-sm border border-gray-300 flex items-center justify-center shadow-lg">
          <div 
            className={`h-2 rounded-sm ${getBatteryBgColor(member.location.battery)}`}
            style={{ width: `${Math.max(15, member.location.battery)}%` }}
          />
        </div>
        
        {/* Offline indicator */}
        {isOffline && (
          <div className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
            <WifiOff size={12} className="text-white" />
          </div>
        )}
        
        {/* Driving direction indicator */}
        {member.location.isDriving && member.location.heading && (
          <div 
            className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 rounded-full"
            style={{ 
              transform: `translate(-50%, -50%) rotate(${member.location.heading}deg)`,
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
            }}
          />
        )}
      </div>
    );
  };

  const mapStyles = [
    { id: 'streets-v12', name: 'Streets', url: 'mapbox://styles/mapbox/streets-v12' },
    { id: 'satellite-streets-v12', name: 'Satellite', url: 'mapbox://styles/mapbox/satellite-streets-v12' },
    { id: 'navigation-day-v1', name: 'Navigation', url: 'mapbox://styles/mapbox/navigation-day-v1' },
    { id: 'dark-v11', name: 'Dark', url: 'mapbox://styles/mapbox/dark-v11' },
  ];

  if (!isLocationSharing || !currentLocation) {
    return (
      <div className="w-full h-[600px] bg-gradient-to-br from-slate-800 to-slate-700 rounded-3xl flex items-center justify-center shadow-2xl">
        <div className="text-center">
          <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <MapPin size={40} className="text-purple-500" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Enable Location Sharing</h3>
          <p className="text-slate-400 mb-6 text-lg">Turn on location sharing to see the live map</p>
          <div className="flex items-center justify-center gap-3 text-slate-500">
            <Target size={20} />
            <span className="text-lg">High accuracy GPS tracking available</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] rounded-3xl overflow-hidden shadow-2xl relative">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        attributionControl={false}
        maxZoom={22} // Allow very high zoom for maximum accuracy
        minZoom={8}
      >
        {/* Enhanced Navigation Controls */}
        <NavigationControl position="top-right" showCompass={true} showZoom={true} />
        
        {/* Enhanced Geolocate Control */}
        <GeolocateControl
          position="top-right"
          trackUserLocation={true}
          showUserHeading={true}
          showAccuracyCircle={true}
          fitBoundsOptions={{ maxZoom: 20 }}
        />
        
        {/* Fullscreen Control */}
        <FullscreenControl position="top-right" />
        
        {/* Scale Control */}
        <ScaleControl position="bottom-left" maxWidth={120} unit="metric" />

        {/* Current User Marker */}
        {currentLocation && (
          <Marker
            longitude={currentLocation.longitude}
            latitude={currentLocation.latitude}
            anchor="center"
          >
            <CustomMarker 
              member={{
                id: 'current-user',
                name: 'You',
                location: currentLocation,
                lastSeen: 'now',
                safetyScore: 100,
                totalRewards: 0,
                isOnline: true
              }}
              isCurrentUser={true}
            />
          </Marker>
        )}

        {/* Circle Members Markers */}
        {members.map((member) => (
          member.location.latitude && member.location.longitude && (
            <Marker
              key={member.id}
              longitude={member.location.longitude}
              latitude={member.location.latitude}
              anchor="center"
            >
              <CustomMarker member={member} isCurrentUser={false} />
            </Marker>
          )
        ))}

        {/* Enhanced Member Info Popup */}
        {selectedMember && selectedMember.location.latitude && selectedMember.location.longitude && (
          <Popup
            longitude={selectedMember.location.longitude}
            latitude={selectedMember.location.latitude}
            anchor="bottom"
            onClose={() => setSelectedMember(null)}
            closeButton={true}
            closeOnClick={false}
            className="member-popup"
            maxWidth="320px"
          >
            <div className="p-5 min-w-[300px]">
              <div className="flex items-center gap-4 mb-5">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center relative overflow-hidden shadow-lg"
                  style={{ backgroundColor: getMarkerColor(selectedMember, selectedMember.id === 'current-user') }}
                >
                  {selectedMember.profilePicture ? (
                    <img 
                      src={selectedMember.profilePicture} 
                      alt={selectedMember.name}
                      className="w-full h-full object-cover"
                    />
                  ) : selectedMember.id === 'current-user' ? (
                    <User size={28} className="text-white" />
                  ) : selectedMember.location.isDriving ? (
                    <Car size={28} className="text-white" />
                  ) : (
                    <div className="w-6 h-6 bg-white rounded-full" />
                  )}
                  {!selectedMember.isOnline && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <WifiOff size={12} className="text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-xl">{selectedMember.name}</h3>
                  <p className="text-slate-600 flex items-center gap-2">
                    <Clock size={14} />
                    {selectedMember.lastSeen}
                    {selectedMember.isOnline ? (
                      <Wifi size={14} className="text-green-500 ml-1" />
                    ) : (
                      <WifiOff size={14} className="text-red-500 ml-1" />
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Car size={18} className={getSpeedColor(selectedMember.location.speed)} />
                    <span className={`font-bold text-xl ${getSpeedColor(selectedMember.location.speed)}`}>
                      {selectedMember.location.speed}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">mph</p>
                </div>
                
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Battery size={18} className={getBatteryColor(selectedMember.location.battery)} />
                    <span className={`font-bold text-xl ${getBatteryColor(selectedMember.location.battery)}`}>
                      {selectedMember.location.battery}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">battery</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Shield size={18} className="text-blue-500" />
                    <span className="font-bold text-xl text-slate-800">{selectedMember.safetyScore}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">safety score</p>
                </div>
                
                <div className="text-center p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Zap size={18} className="text-purple-500" />
                    <span className="font-bold text-xl text-slate-800">{selectedMember.totalRewards}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">CDT tokens</p>
                </div>
              </div>

              {/* Enhanced Accuracy Information */}
              <div className="text-center p-3 bg-slate-50 rounded-xl mb-4">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Target size={16} className={getAccuracyColor(selectedMember.location.accuracy)} />
                  <span className={`font-semibold ${getAccuracyColor(selectedMember.location.accuracy)}`}>
                    ±{Math.round(selectedMember.location.accuracy)}m
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">GPS accuracy</p>
              </div>

              <div className={`px-5 py-4 rounded-xl text-center font-semibold ${
                selectedMember.location.isDriving 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {selectedMember.location.isDriving ? '🚗 Driving' : '🅿️ Stationary'}
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Enhanced Map Style Selector */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-xl">
        <div className="flex gap-2">
          {mapStyles.map((style) => (
            <button
              key={style.id}
              onClick={() => setMapStyle(style.url)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                mapStyle === style.url
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {style.name}
            </button>
          ))}
        </div>
      </div>

      {/* Enhanced Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-2xl p-5 shadow-xl max-w-[220px]">
        <h4 className="font-bold text-slate-800 mb-4 text-lg">Live Tracking</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-purple-500 rounded-full border-2 border-white shadow-sm relative">
              <User size={12} className="text-white absolute inset-0 m-auto" />
            </div>
            <span className="text-slate-700 font-medium">You</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-yellow-500 rounded-full border-2 border-white shadow-sm relative">
              <Car size={12} className="text-white absolute inset-0 m-auto" />
            </div>
            <span className="text-slate-700 font-medium">Driving</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-sm" />
            <span className="text-slate-700 font-medium">Stationary</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-slate-500 rounded-full border-2 border-white shadow-sm opacity-60" />
            <span className="text-slate-700 font-medium">Offline</span>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-4 h-3 bg-green-500 rounded-sm" />
            <span className="text-slate-700 text-sm font-medium">High Battery</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-4 h-3 bg-yellow-500 rounded-sm" />
            <span className="text-slate-700 text-sm font-medium">Medium Battery</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-3 bg-red-500 rounded-sm" />
            <span className="text-slate-700 text-sm font-medium">Low Battery</span>
          </div>
        </div>
      </div>

      {/* Enhanced Live Status Indicator */}
      <div className="absolute top-4 right-4 bg-green-500/95 backdrop-blur-sm text-white px-5 py-3 rounded-2xl flex items-center gap-3 shadow-xl">
        <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
        <span className="font-bold">Live GPS</span>
        {currentLocation && (
          <span className={`text-sm px-3 py-1 rounded-full bg-white/20 font-semibold ${getAccuracyColor(currentLocation.accuracy)}`}>
            ±{Math.round(currentLocation.accuracy)}m
          </span>
        )}
      </div>

      {/* Enhanced Member Count */}
      <div className="absolute bottom-4 right-4 bg-slate-800/95 backdrop-blur-sm text-white px-4 py-3 rounded-2xl flex items-center gap-3 shadow-xl">
        <User size={16} />
        <span className="font-bold">{members.length + 1} active</span>
      </div>
    </div>
  );
};

export default MapView;