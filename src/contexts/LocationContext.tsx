import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

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

interface CircleMember {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  location: LocationData;
  lastSeen: string;
  safetyScore: number;
  totalRewards: number;
  isOnline: boolean;
}

interface LocationContextType {
  currentLocation: LocationData | null;
  circleMembers: CircleMember[];
  isLocationSharing: boolean;
  locationAccuracy: 'high' | 'medium' | 'low';
  toggleLocationSharing: () => void;
  updateLocation: (location: LocationData) => void;
  refreshCircleMembers: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile, updateUserRewards } = useAuth();
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [circleMembers, setCircleMembers] = useState<CircleMember[]>([]);
  const [isLocationSharing, setIsLocationSharing] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<'high' | 'medium' | 'low'>('medium');
  const [watchId, setWatchId] = useState<number | null>(null);
  const [lastSpeedUpdate, setLastSpeedUpdate] = useState<Date | null>(null);
  const [lastPosition, setLastPosition] = useState<{ lat: number; lon: number; time: number; speed: number } | null>(null);
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  const [movementHistory, setMovementHistory] = useState<{ time: number; lat: number; lon: number }[]>([]);

  // Enhanced battery level detection with more realistic simulation
  const getBatteryLevel = async (): Promise<number> => {
    try {
      // Try to use the Battery API if available
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        return Math.round(battery.level * 100);
      }
      
      // Enhanced fallback with time-based battery drain simulation
      const hour = new Date().getHours();
      const minute = new Date().getMinutes();
      const timeBasedDrain = Math.floor((hour * 60 + minute) / 14.4); // Drain throughout day
      
      // Base battery level with realistic variation
      let baseBattery = 100 - timeBasedDrain;
      
      // Add some randomness for realism
      const variation = Math.floor(Math.random() * 10) - 5; // ±5%
      baseBattery += variation;
      
      // Ensure battery is within realistic bounds
      return Math.max(15, Math.min(100, baseBattery));
    } catch (error) {
      console.warn('Battery API not available:', error);
      return Math.floor(Math.random() * 40) + 50; // 50-90%
    }
  };

  // Enhanced speed calculation with better smoothing and accuracy
  const calculateSpeed = (lat1: number, lon1: number, lat2: number, lon2: number, timeDiff: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in meters
    
    const timeInSeconds = timeDiff / 1000;
    const speedMps = distance / timeInSeconds; // Speed in m/s
    const speedMph = speedMps * 2.237; // Convert to mph
    
    // Filter out unrealistic speeds (likely GPS errors)
    if (speedMph > 150 || (speedMph > 80 && timeDiff < 5000)) {
      return 0; // Ignore unrealistic speeds
    }
    
    return Math.max(0, Math.round(speedMph));
  };

  // Enhanced movement detection with better accuracy
  const detectMovement = (accuracy: number): boolean => {
    if (movementHistory.length < 3) return false;
    
    const now = Date.now();
    const recentMovements = movementHistory.filter(m => now - m.time < 30000); // Last 30 seconds
    
    if (recentMovements.length < 2) return false;
    
    // Calculate total distance moved in recent history
    let totalDistance = 0;
    for (let i = 1; i < recentMovements.length; i++) {
      const prev = recentMovements[i - 1];
      const curr = recentMovements[i];
      const distance = calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
      totalDistance += distance;
    }
    
    // Consider accuracy in movement detection
    const movementThreshold = Math.max(5, accuracy * 2); // Minimum 5 meters, scaled by accuracy
    
    return totalDistance > movementThreshold;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Smooth speed calculation using moving average
  const smoothSpeed = (newSpeed: number): number => {
    const maxHistoryLength = 5;
    const updatedHistory = [...speedHistory, newSpeed].slice(-maxHistoryLength);
    setSpeedHistory(updatedHistory);
    
    // Calculate weighted average (more weight to recent speeds)
    let weightedSum = 0;
    let totalWeight = 0;
    
    updatedHistory.forEach((speed, index) => {
      const weight = index + 1; // More recent speeds have higher weight
      weightedSum += speed * weight;
      totalWeight += weight;
    });
    
    return Math.round(weightedSum / totalWeight);
  };

  const updateLocation = async (location: LocationData) => {
    if (!currentUser || !isLocationSharing) return;

    try {
      // Use setDoc with merge: true to create document if it doesn't exist or update if it does
      await setDoc(doc(db, 'userLocations', currentUser.uid), {
        ...location,
        userId: currentUser.uid,
        userName: userProfile?.displayName || 'User',
        profilePicture: userProfile?.profilePicture || '',
        lastUpdated: new Date(),
      }, { merge: true });

      // Update rewards based on speed and movement
      if (lastSpeedUpdate && location.speed >= 0) {
        const timeDiff = (new Date().getTime() - lastSpeedUpdate.getTime()) / (1000 * 60); // minutes
        if (timeDiff >= 0.5) { // Update every 30 seconds for more accurate tracking
          await updateUserRewards({
            speed: location.speed,
            duration: timeDiff
          });
          setLastSpeedUpdate(new Date());
        }
      } else if (location.speed >= 0) {
        setLastSpeedUpdate(new Date());
      }

      setCurrentLocation(location);
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const refreshCircleMembers = async () => {
    if (!userProfile?.joinedCircles.length) return;

    try {
      const members: CircleMember[] = [];

      for (const circleCode of userProfile.joinedCircles) {
        // Get circle data
        const circleQuery = query(
          collection(db, 'circles'),
          where('code', '==', circleCode)
        );
        const circleSnapshot = await getDocs(circleQuery);
        
        if (!circleSnapshot.empty) {
          const circleData = circleSnapshot.docs[0].data();
          
          // Get member data for each member in the circle
          for (const memberId of circleData.members) {
            if (memberId === currentUser?.uid) continue; // Skip current user
            
            try {
              // Get user profile
              const userQuery = query(
                collection(db, 'users'),
                where('uid', '==', memberId)
              );
              const userSnapshot = await getDocs(userQuery);
              
              if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data();
                
                // Get location data
                const locationQuery = query(
                  collection(db, 'userLocations'),
                  where('userId', '==', memberId)
                );
                const locationSnapshot = await getDocs(locationQuery);
                
                let locationData = {
                  latitude: 0,
                  longitude: 0,
                  speed: 0,
                  battery: 85,
                  isDriving: false,
                  lastUpdated: new Date(),
                  accuracy: 10,
                };

                let lastSeen = 'Never';
                if (!locationSnapshot.empty) {
                  const locData = locationSnapshot.docs[0].data();
                  locationData = {
                    latitude: locData.latitude || 0,
                    longitude: locData.longitude || 0,
                    speed: locData.speed || 0,
                    battery: locData.battery || 85,
                    isDriving: locData.speed > 3, // Lower threshold for better detection
                    lastUpdated: locData.lastUpdated?.toDate() || new Date(),
                    accuracy: locData.accuracy || 10,
                  };
                  
                  const timeDiff = Date.now() - locationData.lastUpdated.getTime();
                  if (timeDiff < 60000) lastSeen = 'now';
                  else if (timeDiff < 3600000) lastSeen = `${Math.floor(timeDiff / 60000)} min ago`;
                  else if (timeDiff < 86400000) lastSeen = `${Math.floor(timeDiff / 3600000)} hr ago`;
                  else lastSeen = `${Math.floor(timeDiff / 86400000)} days ago`;
                }

                members.push({
                  id: memberId,
                  name: userData.displayName || 'User',
                  email: userData.email || '',
                  profilePicture: userData.profilePicture || '',
                  location: locationData,
                  lastSeen,
                  safetyScore: userData.safetyScore || 100,
                  totalRewards: userData.totalRewards || 0,
                  isOnline: Date.now() - locationData.lastUpdated.getTime() < 300000, // 5 minutes
                });
              }
            } catch (error) {
              console.error('Error fetching member data:', error);
            }
          }
        }
      }

      setCircleMembers(members);
    } catch (error) {
      console.error('Error refreshing circle members:', error);
    }
  };

  const toggleLocationSharing = async () => {
    if (!isLocationSharing) {
      if ('geolocation' in navigator) {
        // Request permission first
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 20000,
              maximumAge: 0
            });
          });
          
          console.log('Location permission granted');
          setIsLocationSharing(true);
          
          // Set accuracy based on the initial position
          if (position.coords.accuracy <= 5) {
            setLocationAccuracy('high');
          } else if (position.coords.accuracy <= 20) {
            setLocationAccuracy('medium');
          } else {
            setLocationAccuracy('low');
          }
          
        } catch (error) {
          console.warn('Location permission denied or error:', error);
          alert('Location access is required for Circle Drive to work properly. Please enable location services and try again.');
        }
      } else {
        alert('Geolocation is not supported by this browser.');
      }
    } else {
      setIsLocationSharing(false);
      setLocationAccuracy('medium');
      setSpeedHistory([]);
      setMovementHistory([]);
    }
  };

  useEffect(() => {
    if (userProfile) {
      refreshCircleMembers();
      // Refresh every 10 seconds for more real-time updates
      const interval = setInterval(refreshCircleMembers, 10000);
      return () => clearInterval(interval);
    }
  }, [userProfile]);

  useEffect(() => {
    if (isLocationSharing && 'geolocation' in navigator) {
      const startLocationTracking = () => {
        const options: PositionOptions = {
          enableHighAccuracy: true,
          timeout: 30000, // 30 seconds
          maximumAge: 2000 // 2 seconds
        };

        const id = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude, accuracy, heading, altitude, speed } = position.coords;
            const now = Date.now();
            const battery = await getBatteryLevel();

            // Update movement history
            const newMovement = { time: now, lat: latitude, lon: longitude };
            setMovementHistory(prev => [...prev.slice(-10), newMovement]); // Keep last 10 positions

            let calculatedSpeed = 0;
            
            // Use GPS speed if available and reliable
            if (speed !== null && speed >= 0) {
              calculatedSpeed = Math.round(speed * 2.237); // Convert m/s to mph
            } else if (lastPosition) {
              // Calculate speed from position changes
              const timeDiff = now - lastPosition.time;
              if (timeDiff > 2000) { // Calculate every 2 seconds for better accuracy
                calculatedSpeed = calculateSpeed(
                  lastPosition.lat, 
                  lastPosition.lon, 
                  latitude, 
                  longitude, 
                  timeDiff
                );
              } else {
                calculatedSpeed = lastPosition.speed; // Use last known speed
              }
            }

            // Apply speed smoothing
            const smoothedSpeed = smoothSpeed(calculatedSpeed);
            
            // Update last position
            setLastPosition({ lat: latitude, lon: longitude, time: now, speed: smoothedSpeed });

            // Enhanced movement detection
            const isMoving = detectMovement(accuracy) || smoothedSpeed > 2;

            // Update accuracy level based on GPS accuracy
            if (accuracy <= 3) {
              setLocationAccuracy('high');
            } else if (accuracy <= 10) {
              setLocationAccuracy('medium');
            } else {
              setLocationAccuracy('low');
            }

            const locationData: LocationData = {
              latitude,
              longitude,
              speed: smoothedSpeed,
              battery,
              isDriving: isMoving && smoothedSpeed > 2, // More accurate driving detection
              lastUpdated: new Date(),
              accuracy: accuracy || 0,
              heading: heading ?? null,
              altitude: altitude ?? null,
            };

            updateLocation(locationData);
          },
          (error) => {
            console.warn('Location tracking error:', error.message);
            
            // Handle different error types
            switch (error.code) {
              case error.PERMISSION_DENIED:
                setIsLocationSharing(false);
                alert('Location access denied. Please enable location services to use Circle Drive.');
                break;
              case error.POSITION_UNAVAILABLE:
                console.warn('Location information unavailable');
                break;
              case error.TIMEOUT:
                console.warn('Location request timed out - retrying...');
                // Don't disable location sharing on timeout, just log it
                break;
            }
          },
          options
        );

        setWatchId(id);
      };

      startLocationTracking();

      return () => {
        if (watchId) {
          navigator.geolocation.clearWatch(watchId);
        }
      };
    } else {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }
    }
  }, [isLocationSharing, currentUser]);

  const value = {
    currentLocation,
    circleMembers,
    isLocationSharing,
    locationAccuracy,
    toggleLocationSharing,
    updateLocation,
    refreshCircleMembers,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};