import React, { useState } from 'react';
import { MapPin, Eye, EyeOff, Copy, Share, Plus, Battery, Navigation, Users, Target, Wifi, WifiOff } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import MapView from './MapView';

const LocationScreen: React.FC = () => {
  const { currentLocation, circleMembers, isLocationSharing, locationAccuracy, toggleLocationSharing, refreshCircleMembers } = useLocation();
  const { userProfile, joinCircle } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleJoinCircle = async () => {
    if (!joinCode.trim() || joining) return;
    
    setJoining(true);
    try {
      await joinCircle(joinCode.trim().toUpperCase());
      alert('Successfully joined circle!');
      setJoinCode('');
      setShowJoinInput(false);
      // Refresh circle members after joining
      setTimeout(refreshCircleMembers, 1000);
    } catch (error: any) {
      alert(error.message || 'Failed to join circle');
    } finally {
      setJoining(false);
    }
  };

  const copyCircleCode = async () => {
    if (userProfile?.circleCode) {
      await navigator.clipboard.writeText(userProfile.circleCode);
      alert('Circle code copied to clipboard');
    }
  };

  const shareCircleCode = async () => {
    if (userProfile?.circleCode) {
      if (navigator.share) {
        await navigator.share({
          title: 'Join my Circle Drive group',
          text: `Join my Circle Drive group with code: ${userProfile.circleCode}`,
        });
      } else {
        copyCircleCode();
      }
    }
  };

  const getBatteryColor = (battery: number) => {
    if (battery > 60) return 'text-green-500';
    if (battery > 30) return 'text-yellow-500';
    if (battery > 15) return 'text-orange-500';
    return 'text-red-500';
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy <= 5) return 'text-green-500';
    if (accuracy <= 15) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getAccuracyText = (accuracy: number) => {
    if (accuracy <= 5) return 'High Precision';
    if (accuracy <= 15) return 'Good Precision';
    return 'Low Precision';
  };

  const getSpeedColor = (speed: number) => {
    if (speed === 0) return 'text-slate-400';
    if (speed <= 65) return 'text-green-500';
    if (speed <= 75) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getLocationAccuracyBadge = () => {
    switch (locationAccuracy) {
      case 'high':
        return { color: 'bg-green-500', text: 'High Accuracy', icon: Target };
      case 'medium':
        return { color: 'bg-yellow-500', text: 'Medium Accuracy', icon: Navigation };
      case 'low':
        return { color: 'bg-red-500', text: 'Low Accuracy', icon: MapPin };
    }
  };

  const accuracyBadge = getLocationAccuracyBadge();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Live Location</h1>
            <div className="flex items-center gap-3">
              <p className="text-slate-300">
                {isLocationSharing ? 'Sharing location' : 'Location sharing paused'}
              </p>
              {isLocationSharing && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold text-white ${accuracyBadge.color}`}>
                  <accuracyBadge.icon size={12} />
                  {accuracyBadge.text}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={toggleLocationSharing}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isLocationSharing 
                ? 'bg-green-500/30 border border-green-500/50 hover:bg-green-500/40' 
                : 'bg-slate-700/50 hover:bg-slate-600/50'
            }`}
          >
            {isLocationSharing ? (
              <Eye size={24} className="text-green-400" />
            ) : (
              <EyeOff size={24} className="text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Interactive Map */}
      <div className="mb-6">
        <MapView 
          members={circleMembers}
          currentLocation={currentLocation}
          isLocationSharing={isLocationSharing}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Circle Code Section */}
        {userProfile?.circleCode && (
          <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Your Circle Code</h2>
              <div className="flex gap-2">
                <button
                  onClick={copyCircleCode}
                  className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center hover:bg-purple-500/30 transition-colors"
                >
                  <Copy size={16} className="text-purple-400" />
                </button>
                <button
                  onClick={shareCircleCode}
                  className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center hover:bg-purple-500/30 transition-colors"
                >
                  <Share size={16} className="text-purple-400" />
                </button>
              </div>
            </div>
            <p className="text-2xl font-bold text-purple-400 font-mono mb-2">{userProfile.circleCode}</p>
            <p className="text-slate-400 text-sm">
              Share this code with friends to invite them to your circle
            </p>
          </div>
        )}

        {/* Join Circle Section */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Join Circle</h2>
            <button
              onClick={() => setShowJoinInput(!showJoinInput)}
              className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center hover:bg-purple-500/30 transition-colors"
            >
              <Plus size={16} className="text-purple-400" />
            </button>
          </div>
          
          {showJoinInput && (
            <div className="flex gap-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter circle code"
                className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                maxLength={6}
              />
              <button
                onClick={handleJoinCircle}
                disabled={joining || !joinCode.trim()}
                className="bg-purple-500 hover:bg-purple-600 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed"
              >
                {joining ? 'Joining...' : 'Join'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Current Location */}
      {currentLocation && (
        <div className="mt-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={20} className="text-green-500" />
            <h2 className="text-xl font-semibold text-white">Your Location</h2>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold text-white ${accuracyBadge.color}`}>
              <accuracyBadge.icon size={12} />
              GPS Active
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-green-400 font-mono text-sm mb-2">
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </p>
              {currentLocation.altitude && (
                <p className="text-slate-400 text-sm">
                  Altitude: {Math.round(currentLocation.altitude)}m
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Battery size={16} className={getBatteryColor(currentLocation.battery)} />
                <span className={`text-sm font-semibold ${getBatteryColor(currentLocation.battery)}`}>
                  {currentLocation.battery}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Target size={16} className={getAccuracyColor(currentLocation.accuracy)} />
                <span className={`text-sm font-semibold ${getAccuracyColor(currentLocation.accuracy)}`}>
                  ±{Math.round(currentLocation.accuracy)}m
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${getSpeedColor(currentLocation.speed)}`}>
                  {currentLocation.speed} mph
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className={`px-3 py-2 rounded-lg text-sm font-semibold ${
              currentLocation.isDriving 
                ? 'bg-yellow-500/20 text-yellow-400' 
                : 'bg-green-500/20 text-green-400'
            }`}>
              {currentLocation.isDriving ? '🚗 Driving' : '🅿️ Stationary'}
            </div>
            
            <div className="text-right">
              <p className={`text-sm font-semibold ${getAccuracyColor(currentLocation.accuracy)}`}>
                {getAccuracyText(currentLocation.accuracy)}
              </p>
              <p className="text-xs text-slate-400">
                Last updated: {currentLocation.lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Circle Members */}
      <div className="mt-6 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Circle Members</h2>
          <button
            onClick={refreshCircleMembers}
            className="text-purple-400 hover:text-purple-300 text-sm font-semibold transition-colors"
          >
            Refresh
          </button>
        </div>
        {circleMembers.length > 0 ? (
          <div className="space-y-4">
            {circleMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <span className="text-purple-400 font-semibold">
                        {member.name.charAt(0)}
                      </span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-800 ${
                      member.isOnline ? 'bg-green-500' : 'bg-slate-600'
                    }`} />
                    {member.isOnline ? (
                      <Wifi size={10} className="absolute -top-1 -right-1 text-green-400" />
                    ) : (
                      <WifiOff size={10} className="absolute -top-1 -right-1 text-red-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{member.name}</h3>
                    <p className="text-slate-400 text-sm">{member.lastSeen}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Safety</p>
                    <p className="text-sm font-semibold text-white">{member.safetyScore}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Rewards</p>
                    <p className="text-sm font-semibold text-white">{member.totalRewards}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Battery size={14} className={getBatteryColor(member.location.battery)} />
                    <span className={`text-xs font-semibold ${getBatteryColor(member.location.battery)}`}>
                      {member.location.battery}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target size={14} className={getAccuracyColor(member.location.accuracy)} />
                    <span className={`text-xs font-semibold ${getAccuracyColor(member.location.accuracy)}`}>
                      ±{Math.round(member.location.accuracy)}m
                    </span>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                    member.location.isDriving 
                      ? 'bg-yellow-500/20 text-yellow-400' 
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {member.location.isDriving ? 'Driving' : 'Stationary'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-slate-400 text-lg mb-2">No other members in your circles yet</h3>
            <p className="text-slate-500">Share your circle code to invite friends</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationScreen;