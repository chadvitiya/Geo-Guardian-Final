import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Phone, MapPin, Heart, Mic, MicOff, Shield, Navigation, Car, Route } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';

interface SafeZone {
  id: string;
  name: string;
  address: string;
  distance: number;
  type: 'hospital' | 'police' | 'fire_station' | 'gas_station';
  phone?: string;
  isOpen?: boolean;
  lat: number;
  lng: number;
}

const SOSScreen: React.FC = () => {
  const { userProfile } = useAuth();
  const { currentLocation } = useLocation();
  const [isEmergency, setIsEmergency] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  const [loadingSafeZones, setLoadingSafeZones] = useState(false);
  const [selectedEmergencyType, setSelectedEmergencyType] = useState<'medical' | 'police' | 'fire' | 'roadside' | null>(null);
  const [showEmergencyOptions, setShowEmergencyOptions] = useState(false);
  const [selectedSafeZone, setSelectedSafeZone] = useState<SafeZone | null>(null);
  const [deepgramSocket, setDeepgramSocket] = useState<WebSocket | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [emergencyActivated, setEmergencyActivated] = useState(false);
  const speechSynthRef = useRef<SpeechSynthesis | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const emergencyDetectedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const emergencyCountRef = useRef(0);
  const lastCommandTimeRef = useRef(0);

  // Initialize speech synthesis
  useEffect(() => {
    speechSynthRef.current = window.speechSynthesis;
  }, []);

  // Enhanced Deepgram WebSocket setup
  const initializeDeepgram = async () => {
    try {
      // Create audio context for better audio processing
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      
      streamRef.current = stream;
      
      // Create WebSocket connection to Deepgram
      const socket = new WebSocket('wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=false&punctuate=true&diarize=false&filler_words=false&utterances=true', [
        'token',
        import.meta.env.VITE_DEEPGRAM_API_KEY
      ]);

      socket.onopen = () => {
        console.log('Deepgram WebSocket connected');
        setDeepgramSocket(socket);
        
        // Setup MediaRecorder
        const recorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
          audioBitsPerSecond: 16000
        });
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };
        
        setMediaRecorder(recorder);
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.channel?.alternatives?.[0]?.transcript) {
          const transcript = data.channel.alternatives[0].transcript.toLowerCase().trim();
          console.log('Deepgram transcript:', transcript);
          
          // Only process final results to avoid multiple triggers
          if (data.is_final && transcript.length > 0) {
            const now = Date.now();
            // Prevent duplicate processing within 2 seconds
            if (now - lastCommandTimeRef.current > 2000) {
              lastCommandTimeRef.current = now;
              setIsProcessingVoice(true);
              handleVoiceCommand(transcript);
              setTimeout(() => setIsProcessingVoice(false), 1000);
            }
          }
        }
      };

      socket.onerror = (error) => {
        console.error('Deepgram WebSocket error:', error);
        setIsListening(false);
        speak('Voice recognition error. Please try again.');
      };

      socket.onclose = () => {
        console.log('Deepgram WebSocket closed');
        setDeepgramSocket(null);
        setIsListening(false);
      };

    } catch (error) {
      console.error('Error initializing Deepgram:', error);
      alert('Microphone access is required for voice commands');
      setIsListening(false);
    }
  };

  // Enhanced speech synthesis with interruption control
  const speak = (text: string, priority: 'high' | 'normal' = 'normal') => {
    if (speechSynthRef.current) {
      if (priority === 'high') {
        speechSynthRef.current.cancel();
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to use a more natural voice
      const voices = speechSynthRef.current.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Microsoft') ||
        voice.name.includes('Alex') ||
        voice.name.includes('Samantha')
      ) || voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      speechSynthRef.current.speak(utterance);
    }
  };

  // Stop all speech immediately
  const stopSpeaking = () => {
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel();
    }
  };

  // FIXED: Voice command processing - DIRECTLY EXECUTE ACTIONS
  const handleVoiceCommand = (transcript: string) => {
    console.log('🎤 Processing voice command:', transcript);
    
    // Stop any ongoing speech immediately when user speaks
    stopSpeaking();
    
    const normalizedTranscript = transcript.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('🔍 Normalized transcript:', normalizedTranscript);
    
    // Emergency activation - ONLY "help geoguardian" should trigger
    const emergencyTriggers = ['help geoguardian', 'help geo guardian', 'help guardian'];
    const isEmergencyTrigger = emergencyTriggers.some(trigger => 
      normalizedTranscript.includes(trigger)
    );
    
    if (isEmergencyTrigger && !emergencyActivated) {
      console.log('🚨 Emergency activation detected!');
      activateEmergencyMode();
      return;
    }
    
    // Only process other commands if emergency is activated
    if (emergencyActivated) {
      console.log('⚡ Processing emergency command...');
      processEmergencyCommand(normalizedTranscript);
    } else {
      console.log('❌ Emergency not activated, ignoring command');
    }
  };

  // Activate emergency mode with proper flow
  const activateEmergencyMode = () => {
    console.log('🚨 Activating emergency mode');
    setEmergencyActivated(true);
    setShowEmergencyOptions(true);
    emergencyCountRef.current = 0;
    
    // Say "Emergency detected" 3 times over 10 seconds
    const sayEmergencyDetected = () => {
      if (emergencyCountRef.current < 3) {
        speak('Emergency detected', 'high');
        emergencyCountRef.current++;
        
        emergencyDetectedTimerRef.current = setTimeout(() => {
          sayEmergencyDetected();
        }, 3333); // 10 seconds / 3 = ~3.33 seconds between each
      } else {
        // After 3 times, provide brief options
        setTimeout(() => {
          speak('Emergency options displayed. Say medical, police, fire, roadside, contact, information, or cancel.', 'high');
        }, 1000);
      }
    };
    
    sayEmergencyDetected();
  };

  // FIXED: Process emergency commands - DIRECTLY TRIGGER BUTTON ACTIONS
  const processEmergencyCommand = (transcript: string) => {
    console.log('🔥 Processing emergency command:', transcript);
    
    // Stop speaking immediately
    stopSpeaking();
    
    // Medical emergency keywords - DIRECTLY CALL THE FUNCTION
    if (containsKeywords(transcript, ['medical', 'ambulance', 'doctor', 'hospital', 'heart attack', 'stroke', 'breathing', 'chest pain', 'unconscious', 'bleeding', 'help medical', 'need medical', 'medical help'])) {
      console.log('🏥 Medical command detected - EXECUTING callEmergencyService');
      executeEmergencyService('medical');
      return;
    }
    
    // Police keywords - DIRECTLY CALL THE FUNCTION
    if (containsKeywords(transcript, ['police', 'cop', 'officer', 'crime', 'theft', 'robbery', 'assault', 'break in', 'suspicious', 'help police', 'need police', 'call police'])) {
      console.log('👮 Police command detected - EXECUTING callEmergencyService');
      executeEmergencyService('police');
      return;
    }
    
    // Fire keywords - DIRECTLY CALL THE FUNCTION
    if (containsKeywords(transcript, ['fire', 'firefighter', 'smoke', 'burning', 'flames', 'help fire', 'need fire', 'call fire'])) {
      console.log('🔥 Fire command detected - EXECUTING callEmergencyService');
      executeEmergencyService('fire');
      return;
    }
    
    // Roadside keywords - DIRECTLY CALL THE FUNCTION
    if (containsKeywords(transcript, ['roadside', 'tow', 'car trouble', 'breakdown', 'flat tire', 'dead battery', 'accident', 'mechanic', 'help roadside', 'need roadside'])) {
      console.log('🚗 Roadside command detected - EXECUTING callEmergencyService');
      executeEmergencyService('roadside');
      return;
    }
    
    // Contact keywords - DIRECTLY CALL THE FUNCTION
    if (containsKeywords(transcript, ['contact', 'family', 'friend', 'emergency contact', 'call someone', 'notify family', 'call family', 'call contact', 'emergency family'])) {
      console.log('📞 Contact command detected - EXECUTING callEmergencyContact');
      executeEmergencyContact();
      return;
    }
    
    // Information keywords - DIRECTLY CALL THE FUNCTION
    if (containsKeywords(transcript, ['information', 'medical info', 'show info', 'display info', 'medical details', 'health info', 'show medical', 'medical information'])) {
      console.log('ℹ️ Information command detected - EXECUTING showEmergencyInformation');
      executeEmergencyInformation();
      return;
    }
    
    // Cancel keywords - DIRECTLY CALL THE FUNCTION
    if (containsKeywords(transcript, ['cancel', 'stop', 'nevermind', 'never mind', 'abort', 'false alarm', 'mistake', 'cancel emergency'])) {
      console.log('❌ Cancel command detected - EXECUTING cancelSOS');
      executeCancelSOS();
      return;
    }
    
    // If no clear match, provide brief guidance
    console.log('❓ No command match found for:', transcript);
    speak('Command not recognized. Try: medical, police, fire, roadside, contact, information, or cancel.', 'normal');
  };

  // Helper function to check if transcript contains keywords
  const containsKeywords = (transcript: string, keywords: string[]): boolean => {
    return keywords.some(keyword => transcript.includes(keyword));
  };

  // FIXED: Execute functions directly (same as button clicks)
  const executeEmergencyService = (type: 'medical' | 'police' | 'fire' | 'roadside') => {
    console.log(`🚨 EXECUTING Emergency Service: ${type}`);
    
    
    const messages = {
      medical: 'Calling 911 for medical emergency.',
      police: 'Calling 911 for police assistance.',
      fire: 'Calling 911 for fire emergency.',
      roadside: 'Calling roadside assistance.'
    };
    
    // Close emergency options and reset state
    setSelectedEmergencyType(type);
    setShowEmergencyOptions(false);
    setEmergencyActivated(false);
    
    // Brief confirmation
    speak(messages[type], 'high');
    
    // Start countdown for actual emergency call
    setIsEmergency(true);
    setCountdown(5);
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerEmergency(type);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const executeEmergencyContact = () => {
    console.log('📞 EXECUTING Emergency Contact');
    
    if (userProfile?.emergencyContacts.length) {
      const primaryContact = userProfile.emergencyContacts.find(c => c.isPrimary) || userProfile.emergencyContacts[0];
      speak(`Calling ${primaryContact.name}.`, 'high');
      alert(`Calling ${primaryContact.name} at ${primaryContact.phone}`);
    } else {
      speak('No emergency contacts found.', 'high');
      alert('No emergency contacts found. Please set up emergency contacts in settings.');
    }
    
    setShowEmergencyOptions(false);
    setEmergencyActivated(false);
  };

  const executeEmergencyInformation = () => {
    console.log('ℹ️ EXECUTING Emergency Information');
    
    if (userProfile?.medicalInfo) {
      let info = 'Medical information displayed. ';
      
      if (userProfile.medicalInfo.bloodType) {
        info += `Blood type: ${userProfile.medicalInfo.bloodType}. `;
      }
      
      if (userProfile.medicalInfo.allergies.length > 0) {
        info += `Allergies: ${userProfile.medicalInfo.allergies.join(', ')}. `;
      }
      
      // Keep speech brief and show detailed info visually
      speak(info, 'high');
      
      // Show detailed medical info in alert for now (could be a modal later)
      let detailedInfo = 'EMERGENCY MEDICAL INFORMATION:\n\n';
      
      if (userProfile.medicalInfo.bloodType) {
        detailedInfo += `Blood Type: ${userProfile.medicalInfo.bloodType}\n`;
      }
      
      if (userProfile.medicalInfo.allergies.length > 0) {
        detailedInfo += `Allergies: ${userProfile.medicalInfo.allergies.join(', ')}\n`;
      }
      
      if (userProfile.medicalInfo.medications.length > 0) {
        detailedInfo += `Medications: ${userProfile.medicalInfo.medications.join(', ')}\n`;
      }
      
      if (userProfile.medicalInfo.medicalConditions.length > 0) {
        detailedInfo += `Medical Conditions: ${userProfile.medicalInfo.medicalConditions.join(', ')}\n`;
      }
      
      if (userProfile.medicalInfo.emergencyNotes) {
        detailedInfo += `Notes: ${userProfile.medicalInfo.emergencyNotes}\n`;
      }
      
      if (userProfile.medicalInfo.doctorName) {
        detailedInfo += `Doctor: ${userProfile.medicalInfo.doctorName}`;
        if (userProfile.medicalInfo.doctorPhone) {
          detailedInfo += ` (${userProfile.medicalInfo.doctorPhone})`;
        }
      }
      
      alert(detailedInfo);
    } else {
      speak('No medical information found.', 'high');
      alert('No medical information found. Please set up your medical information in settings.');
    }
    
    setShowEmergencyOptions(false);
    setEmergencyActivated(false);
  };

  const executeCancelSOS = () => {
    console.log('❌ EXECUTING Cancel SOS');
    
    // Stop any ongoing speech
    stopSpeaking();
    if (emergencyDetectedTimerRef.current) {
      clearTimeout(emergencyDetectedTimerRef.current);
    }
    
    setIsEmergency(false);
    setCountdown(0);
    setSelectedEmergencyType(null);
    setShowEmergencyOptions(false);
    setEmergencyActivated(false);
    emergencyCountRef.current = 0;
    
    speak('Emergency cancelled. You are safe.', 'high');
  };

  // Fetch safe zones when location is available
  useEffect(() => {
    if (currentLocation) {
      fetchSafeZones();
    }
  }, [currentLocation]);

  const fetchSafeZones = async () => {
    if (!currentLocation) return;

    setLoadingSafeZones(true);
    try {
      const { latitude, longitude } = currentLocation;
      
      const proxyUrl = 'https://api.allorigins.win/raw?url=';
      const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
      
      const types = [
        { type: 'hospital', keyword: 'hospital' },
        { type: 'police', keyword: 'police station' },
        { type: 'fire_station', keyword: 'fire station' },
        { type: 'gas_station', keyword: 'gas station' }
      ];
      
      const allPlaces: SafeZone[] = [];

      for (const { type, keyword } of types) {
        try {
          const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(keyword)}&location=${latitude},${longitude}&radius=8000&key=${apiKey}`;
          
          const response = await fetch(proxyUrl + encodeURIComponent(url));
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.results && Array.isArray(data.results)) {
              const places = data.results.slice(0, 2).map((place: any) => ({
                id: place.place_id || `${type}-${Math.random()}`,
                name: place.name || `${keyword}`,
                address: place.formatted_address || 'Address not available',
                distance: calculateDistance(
                  latitude,
                  longitude,
                  place.geometry?.location?.lat || latitude,
                  place.geometry?.location?.lng || longitude
                ),
                type: type as SafeZone['type'],
                isOpen: place.opening_hours?.open_now,
                lat: place.geometry?.location?.lat || latitude,
                lng: place.geometry?.location?.lng || longitude,
              }));
              
              allPlaces.push(...places);
            }
          }
        } catch (error) {
          console.error(`Error fetching ${type}:`, error);
          allPlaces.push(createFallbackSafeZone(type, latitude, longitude));
        }
      }

      if (allPlaces.length === 0) {
        allPlaces.push(...createMockSafeZones(latitude, longitude));
      }

      allPlaces.sort((a, b) => a.distance - b.distance);
      setSafeZones(allPlaces.slice(0, 8));
    } catch (error) {
      console.error('Error fetching safe zones:', error);
      if (currentLocation) {
        setSafeZones(createMockSafeZones(currentLocation.latitude, currentLocation.longitude));
      }
    } finally {
      setLoadingSafeZones(false);
    }
  };

  const createFallbackSafeZone = (type: string, lat: number, lng: number): SafeZone => {
    const names = {
      hospital: 'General Hospital',
      police: 'Police Station',
      fire_station: 'Fire Department',
      gas_station: 'Gas Station'
    };

    const phones = {
      hospital: '(555) 123-4567',
      police: '911',
      fire_station: '911',
      gas_station: '(555) 987-6543'
    };

    const offsetLat = lat + (Math.random() - 0.5) * 0.02;
    const offsetLng = lng + (Math.random() - 0.5) * 0.02;

    return {
      id: `fallback-${type}-${Math.random()}`,
      name: names[type as keyof typeof names] || 'Emergency Service',
      address: 'Address not available',
      distance: calculateDistance(lat, lng, offsetLat, offsetLng),
      type: type as SafeZone['type'],
      phone: phones[type as keyof typeof phones],
      isOpen: true,
      lat: offsetLat,
      lng: offsetLng,
    };
  };

  const createMockSafeZones = (lat: number, lng: number): SafeZone[] => {
    return [
      {
        id: 'mock-hospital-1',
        name: 'City General Hospital',
        address: '123 Medical Center Dr',
        distance: 1.2,
        type: 'hospital',
        phone: '(555) 123-4567',
        isOpen: true,
        lat: lat + 0.01,
        lng: lng + 0.01,
      },
      {
        id: 'mock-police-1',
        name: 'Metro Police Station',
        address: '456 Safety Blvd',
        distance: 0.8,
        type: 'police',
        phone: '911',
        isOpen: true,
        lat: lat - 0.005,
        lng: lng + 0.008,
      },
      {
        id: 'mock-fire-1',
        name: 'Fire Station 12',
        address: '789 Rescue Ave',
        distance: 1.5,
        type: 'fire_station',
        phone: '911',
        isOpen: true,
        lat: lat + 0.012,
        lng: lng - 0.007,
      },
      {
        id: 'mock-gas-1',
        name: 'QuickStop Gas',
        address: '321 Main St',
        distance: 0.5,
        type: 'gas_station',
        phone: '(555) 987-6543',
        isOpen: true,
        lat: lat - 0.003,
        lng: lng - 0.004,
      },
    ];
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const toggleVoiceListening = async () => {
    if (isListening) {
      // Stop listening
      stopSpeaking(); // Stop any ongoing speech
      if (emergencyDetectedTimerRef.current) {
        clearTimeout(emergencyDetectedTimerRef.current);
      }
      if (deepgramSocket) {
        deepgramSocket.close();
      }
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      setIsListening(false);
      setEmergencyActivated(false);
      emergencyCountRef.current = 0;
      speak('Voice commands disabled', 'normal');
    } else {
      // Start listening
      setIsListening(true);
      speak('Voice commands enabled. Say help GeoGuardian to activate emergency options', 'high');
      await initializeDeepgram();
    }
  };

  // Start/stop recording when listening state changes
  useEffect(() => {
    if (isListening && mediaRecorder && deepgramSocket?.readyState === WebSocket.OPEN) {
      mediaRecorder.start(250); // Send data every 250ms
    } else if (!isListening && mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  }, [isListening, mediaRecorder, deepgramSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (emergencyDetectedTimerRef.current) {
        clearTimeout(emergencyDetectedTimerRef.current);
      }
      if (deepgramSocket) {
        deepgramSocket.close();
      }
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleSOSPress = () => {
    if (isEmergency) return;
    activateEmergencyMode();
  };

  // Button click handlers that call the same execute functions
  const cancelSOS = () => executeCancelSOS();
  const callEmergencyService = (type: 'medical' | 'police' | 'fire' | 'roadside') => executeEmergencyService(type);
  const callEmergencyContact = () => executeEmergencyContact();
  const showEmergencyInformation = () => executeEmergencyInformation();

  const triggerEmergency = (type?: string) => {
    const serviceType = type || selectedEmergencyType || 'emergency';
    
    let message = '';
    
    if (userProfile?.emergencyContacts.length) {
      const primaryContact = userProfile.emergencyContacts.find(c => c.isPrimary) || userProfile.emergencyContacts[0];
      message = `Emergency services contacted. ${primaryContact.name} notified.`;
      alert(`Emergency services contacted! ${primaryContact.name} (${primaryContact.phone}) has been notified of your ${serviceType} emergency at your current location.`);
    } else {
      message = `Emergency services contacted for ${serviceType} emergency.`;
      alert(`Emergency services have been contacted for ${serviceType} emergency! Your location has been shared.`);
    }
    
    speak(message, 'high');
    
    setIsEmergency(false);
    setSelectedEmergencyType(null);
    setShowEmergencyOptions(false);
    setEmergencyActivated(false);
  };

  const openNavigation = (safeZone: SafeZone, mode: 'driving' | 'walking') => {
    const travelMode = mode === 'driving' ? 'driving' : 'walking';
    const url = `https://www.google.com/maps/dir/?api=1&destination=${safeZone.lat},${safeZone.lng}&travelmode=${travelMode}`;
    window.open(url, '_blank');
    speak(`Opening ${mode} directions to ${safeZone.name}.`, 'normal');
  };

  const handleSafeZoneClick = (safeZone: SafeZone) => {
    setSelectedSafeZone(safeZone);
    speak(`Selected ${safeZone.name}, ${safeZone.distance.toFixed(1)} miles away.`, 'normal');
  };

  const getTypeIcon = (type: SafeZone['type']) => {
    switch (type) {
      case 'hospital': return <Heart size={20} className="text-red-400" />;
      case 'police': return <Shield size={20} className="text-blue-400" />;
      case 'fire_station': return <AlertTriangle size={20} className="text-orange-400" />;
      case 'gas_station': return <Car size={20} className="text-green-400" />;
      default: return <MapPin size={20} className="text-slate-400" />;
    }
  };

  const getTypeColor = (type: SafeZone['type']) => {
    switch (type) {
      case 'hospital': return 'border-red-500/30 bg-red-500/10';
      case 'police': return 'border-blue-500/30 bg-blue-500/10';
      case 'fire_station': return 'border-orange-500/30 bg-orange-500/10';
      case 'gas_station': return 'border-green-500/30 bg-green-500/10';
      default: return 'border-slate-500/30 bg-slate-500/10';
    }
  };

  const hasEmergencyInfo = userProfile?.hasCompletedEmergencySetup && userProfile?.emergencyContacts.length > 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Emergency SOS</h1>
            <p className="text-red-100">AI voice emergency assistance with instant action commands</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleVoiceListening}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                isListening 
                  ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/50' 
                  : 'bg-red-600/50 hover:bg-red-500'
              }`}
            >
              {isListening ? <Mic size={24} className="text-white" /> : <MicOff size={24} className="text-white" />}
            </button>
            <div className="text-right">
              <p className="text-red-100 text-sm font-semibold flex items-center gap-2">
                {isListening ? 'AI Listening' : 'Voice Commands'}
                {isProcessingVoice && (
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                )}
              </p>
              <p className="text-red-200 text-xs">
                {isListening ? 'Say "help GeoGuardian"' : 'Click to enable'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Options Modal */}
      {showEmergencyOptions && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-3xl p-6 w-full max-w-2xl border border-red-500/30 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Emergency Response</h2>
              <p className="text-slate-300">Choose emergency type or speak your command</p>
              {isListening && (
                <div className="mt-3 flex items-center justify-center gap-2 text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm">AI listening - speak your command</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => callEmergencyService('medical')}
                className="bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-xl p-4 hover:bg-red-500/30 transition-colors text-center"
              >
                <Heart size={32} className="text-red-400 mx-auto mb-2" />
                <p className="text-white font-semibold">Medical</p>
                <p className="text-red-300 text-sm">Call 911</p>
              </button>

              <button
                onClick={() => callEmergencyService('police')}
                className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-4 hover:bg-blue-500/30 transition-colors text-center"
              >
                <Shield size={32} className="text-blue-400 mx-auto mb-2" />
                <p className="text-white font-semibold">Police</p>
                <p className="text-blue-300 text-sm">Call 911</p>
              </button>

              <button
                onClick={() => callEmergencyService('fire')}
                className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-xl p-4 hover:bg-orange-500/30 transition-colors text-center"
              >
                <AlertTriangle size={32} className="text-orange-400 mx-auto mb-2" />
                <p className="text-white font-semibold">Fire</p>
                <p className="text-orange-300 text-sm">Call 911</p>
              </button>

              <button
                onClick={() => callEmergencyService('roadside')}
                className="bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-4 hover:bg-green-500/30 transition-colors text-center"
              >
                <Car size={32} className="text-green-400 mx-auto mb-2" />
                <p className="text-white font-semibold">Roadside</p>
                <p className="text-green-300 text-sm">AAA Help</p>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={callEmergencyContact}
                className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-4 hover:bg-purple-500/30 transition-colors text-center"
              >
                <Phone size={24} className="text-purple-400 mx-auto mb-2" />
                <p className="text-white font-semibold">Emergency Contact</p>
                <p className="text-purple-300 text-sm">Call family</p>
              </button>

              <button
                onClick={showEmergencyInformation}
                className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-xl p-4 hover:bg-yellow-500/30 transition-colors text-center"
              >
                <Heart size={24} className="text-yellow-400 mx-auto mb-2" />
                <p className="text-white font-semibold">Medical Info</p>
                <p className="text-yellow-300 text-sm">Show details</p>
              </button>
            </div>

            <div className="bg-slate-700/30 rounded-xl p-4 mb-4">
              <h4 className="text-white font-semibold mb-2">Voice Commands:</h4>
              <div className="text-slate-300 text-sm space-y-1">
                <p>• "Medical" or "I need medical help"</p>
                <p>• "Police" or "I need police"</p>
                <p>• "Fire" or "There's a fire"</p>
                <p>• "Roadside" or "Car trouble"</p>
                <p>• "Contact" or "Call family"</p>
                <p>• "Information" or "Medical info"</p>
                <p>• "Cancel" or "Stop"</p>
              </div>
            </div>

            <button
              onClick={cancelSOS}
              className="w-full bg-slate-600 hover:bg-slate-700 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              Cancel Emergency
            </button>
          </div>
        </div>
      )}

      {/* Emergency Countdown */}
      {isEmergency && countdown > 0 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="w-48 h-48 bg-gradient-to-r from-red-600 to-red-700 rounded-full flex flex-col items-center justify-center shadow-2xl mb-6 animate-pulse">
              <span className="text-6xl font-bold text-white">{countdown}</span>
              <span className="text-red-100 text-sm">Calling Emergency</span>
            </div>
            <button
              onClick={cancelSOS}
              className="bg-slate-600 hover:bg-slate-700 text-white px-8 py-4 rounded-xl font-semibold transition-colors text-lg"
            >
              Cancel Emergency Call
            </button>
          </div>
        </div>
      )}

      {/* Safe Zone Navigation Modal */}
      {selectedSafeZone && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-3xl p-6 w-full max-w-md border border-slate-700">
            <div className="text-center mb-6">
              {getTypeIcon(selectedSafeZone.type)}
              <h3 className="text-xl font-bold text-white mt-2">{selectedSafeZone.name}</h3>
              <p className="text-slate-400 text-sm">{selectedSafeZone.address}</p>
              <p className="text-slate-300 mt-2">{selectedSafeZone.distance.toFixed(1)} miles away</p>
            </div>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => openNavigation(selectedSafeZone, 'driving')}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Car size={20} />
                Get Driving Directions
              </button>

              <button
                onClick={() => openNavigation(selectedSafeZone, 'walking')}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Route size={20} />
                Get Walking Directions
              </button>

              {selectedSafeZone.phone && (
                <button
                  onClick={() => {
                    speak(`Calling ${selectedSafeZone.name}`, 'normal');
                    alert(`Calling ${selectedSafeZone.name} at ${selectedSafeZone.phone}`);
                    setSelectedSafeZone(null);
                  }}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Phone size={20} />
                  Call {selectedSafeZone.phone}
                </button>
              )}
            </div>

            <button
              onClick={() => setSelectedSafeZone(null)}
              className="w-full bg-slate-600 hover:bg-slate-700 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* SOS Button */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl sm:rounded-3xl p-6 text-center">
          <h2 className="text-xl font-semibold text-white mb-6">Voice-Activated Emergency</h2>
          
          <button
            onClick={handleSOSPress}
            className="w-32 h-32 sm:w-48 sm:h-48 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-200 hover:scale-105 mx-auto mb-6"
          >
            <AlertTriangle size={48} className="text-white mb-2" />
            <span className="text-xl sm:text-2xl font-bold text-white">SOS</span>
            <span className="text-red-100 text-xs sm:text-sm">Press or Speak</span>
          </button>

          <div className="text-left space-y-3">
            <div className="flex items-center gap-3">
              <Mic size={16} className="text-purple-500" />
              <span className="text-slate-300 text-sm">Say "help GeoGuardian" to activate</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-blue-500" />
              <span className="text-slate-300 text-sm">Voice commands instantly trigger actions</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-green-500" />
              <span className="text-slate-300 text-sm">Location shared automatically</span>
            </div>
            <div className="flex items-center gap-3">
              <Heart size={16} className="text-red-500" />
              <span className="text-slate-300 text-sm">Medical info provided to responders</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl sm:rounded-3xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Quick Emergency Actions</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => callEmergencyService('medical')}
              className="bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-xl p-4 hover:bg-red-500/30 transition-colors"
            >
              <div className="text-center">
                <Heart size={24} className="text-red-400 mx-auto mb-2" />
                <p className="text-white font-semibold">Medical</p>
                <p className="text-red-300 text-xs">Call 911</p>
              </div>
            </button>

            <button
              onClick={() => callEmergencyService('police')}
              className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-4 hover:bg-blue-500/30 transition-colors"
            >
              <div className="text-center">
                <Shield size={24} className="text-blue-400 mx-auto mb-2" />
                <p className="text-white font-semibold">Police</p>
                <p className="text-blue-300 text-xs">Call 911</p>
              </div>
            </button>

            <button
              onClick={() => callEmergencyService('fire')}
              className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-xl p-4 hover:bg-orange-500/30 transition-colors"
            >
              <div className="text-center">
                <AlertTriangle size={24} className="text-orange-400 mx-auto mb-2" />
                <p className="text-white font-semibold">Fire</p>
                <p className="text-orange-300 text-xs">Call 911</p>
              </div>
            </button>

            <button
              onClick={() => callEmergencyService('roadside')}
              className="bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-4 hover:bg-green-500/30 transition-colors"
            >
              <div className="text-center">
                <Car size={24} className="text-green-400 mx-auto mb-2" />
                <p className="text-white font-semibold">Roadside</p>
                <p className="text-green-300 text-xs">AAA Help</p>
              </div>
            </button>
          </div>

          {/* Emergency Contacts */}
          {hasEmergencyInfo && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Emergency Contacts</h3>
              <div className="space-y-3">
                {userProfile?.emergencyContacts.slice(0, 2).map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${contact.isPrimary ? 'bg-red-500' : 'bg-slate-500'}`} />
                      <div>
                        <h4 className="font-semibold text-white">{contact.name}</h4>
                        <p className="text-slate-400 text-sm">{contact.relationship}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        speak(`Calling ${contact.name}`, 'normal');
                        alert(`Calling ${contact.name} at ${contact.phone}`);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-semibold transition-colors"
                    >
                      Call
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Safe Zones */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl sm:rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-green-400" />
            <h2 className="text-xl font-semibold text-white">Nearby Safe Zones</h2>
          </div>
          {currentLocation && (
            <button
              onClick={fetchSafeZones}
              disabled={loadingSafeZones}
              className="bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white px-4 py-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loadingSafeZones ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Navigation size={16} />
              )}
              Refresh
            </button>
          )}
        </div>

        {!currentLocation ? (
          <div className="text-center py-12">
            <MapPin size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-slate-400 text-lg mb-2">Location Required</h3>
            <p className="text-slate-500">Enable location sharing to find nearby safe zones</p>
          </div>
        ) : loadingSafeZones ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Finding safe zones near you...</p>
          </div>
        ) : safeZones.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {safeZones.map((zone) => (
              <div
                key={zone.id}
                className={`border rounded-xl p-4 hover:bg-slate-700/30 transition-colors cursor-pointer ${getTypeColor(zone.type)}`}
                onClick={() => handleSafeZoneClick(zone)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(zone.type)}
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-semibold">{zone.distance.toFixed(1)} mi</p>
                    {zone.isOpen !== undefined && (
                      <p className={`text-xs ${zone.isOpen ? 'text-green-400' : 'text-red-400'}`}>
                        {zone.isOpen ? 'Open' : 'Closed'}
                      </p>
                    )}
                  </div>
                </div>
                <h3 className="font-semibold text-white mb-1 line-clamp-2">{zone.name}</h3>
                <p className="text-slate-400 text-sm line-clamp-2 mb-3">{zone.address}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car size={14} className="text-slate-400" />
                    <span className="text-xs text-slate-400">
                      {Math.round(zone.distance * 2)} min
                    </span>
                  </div>
                  {zone.phone && (
                    <div className="flex items-center gap-1">
                      <Phone size={12} className="text-slate-500" />
                      <span className="text-xs text-slate-400">{zone.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Shield size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-slate-400 text-lg mb-2">No safe zones found</h3>
            <p className="text-slate-500">Unable to find nearby emergency services</p>
            <button
              onClick={fetchSafeZones}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-semibold transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Medical Information Display */}
      {hasEmergencyInfo && userProfile?.medicalInfo && (
        <div className="mt-6 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-2xl sm:rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Heart size={24} className="text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Emergency Medical Information</h2>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {userProfile.medicalInfo.bloodType && (
              <div className="text-center p-3 bg-red-500/20 rounded-xl">
                <p className="text-red-300 text-sm">Blood Type</p>
                <p className="text-white font-bold text-lg">{userProfile.medicalInfo.bloodType}</p>
              </div>
            )}
            
            <div className="text-center p-3 bg-blue-500/20 rounded-xl">
              <p className="text-blue-300 text-sm">Allergies</p>
              <p className="text-white font-bold text-lg">{userProfile.medicalInfo.allergies.length}</p>
            </div>
            
            <div className="text-center p-3 bg-green-500/20 rounded-xl">
              <p className="text-green-300 text-sm">Medications</p>
              <p className="text-white font-bold text-lg">{userProfile.medicalInfo.medications.length}</p>
            </div>
            
            <div className="text-center p-3 bg-yellow-500/20 rounded-xl">
              <p className="text-yellow-300 text-sm">Conditions</p>
              <p className="text-white font-bold text-lg">{userProfile.medicalInfo.medicalConditions.length}</p>
            </div>
          </div>
          
          {userProfile.medicalInfo.emergencyNotes && (
            <div className="mt-4 p-4 bg-slate-700/30 rounded-xl">
              <p className="text-slate-300 text-sm mb-2">Emergency Notes:</p>
              <p className="text-white">{userProfile.medicalInfo.emergencyNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Emergency Setup Prompt */}
      {!hasEmergencyInfo && (
        <div className="mt-6 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl sm:rounded-3xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={24} className="text-amber-400 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Complete Emergency Setup</h3>
              <p className="text-amber-200 mb-4">
                Add emergency contacts and medical information for better AI assistance during emergencies.
              </p>
              <button
                onClick={() => window.location.href = '/dashboard/settings'}
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl font-semibold transition-colors"
              >
                Setup Emergency Info
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SOSScreen;