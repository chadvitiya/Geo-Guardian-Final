import React from 'react';
import { Battery, Car, Users, RefreshCw, Shield, Zap } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import MapView from './MapView';

const CircleScreen: React.FC = () => {
  const { currentLocation, circleMembers, refreshCircleMembers, isLocationSharing } = useLocation();
  const { userProfile } = useAuth();

  const getBatteryColor = (battery: number) => {
    if (battery > 60) return 'text-green-500';
    if (battery > 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSpeedColor = (speed: number) => {
    if (speed === 0) return 'text-slate-400';
    if (speed <= 65) return 'text-green-500';
    if (speed <= 75) return 'text-yellow-500';
    return 'text-red-500';
  };

  const allMembers = [
    ...(currentLocation ? [{
      id: 'current-user',
      name: 'You',
      profilePicture: userProfile?.profilePicture,
      location: currentLocation,
      lastSeen: 'now',
      safetyScore: userProfile?.safetyScore || 100,
      totalRewards: userProfile?.totalRewards || 0,
      isOnline: true,
    }] : []),
    ...circleMembers.map(member => ({
      id: member.id,
      name: member.name,
      profilePicture: member.profilePicture,
      location: member.location,
      lastSeen: member.lastSeen,
      safetyScore: member.safetyScore,
      totalRewards: member.totalRewards,
      isOnline: member.isOnline,
    }))
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">GeoGuardian</h1>
            <p className="text-slate-300">{allMembers.length} members active</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 rounded-xl border border-green-500/30">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-sm font-semibold">Live Tracking</span>
            </div>
            <button 
              onClick={refreshCircleMembers}
              className="w-12 h-12 bg-slate-700/50 rounded-xl flex items-center justify-center hover:bg-slate-600/50 transition-colors"
            >
              <RefreshCw size={20} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Map */}
      <div className="mb-6">
        <MapView 
          members={circleMembers}
          currentLocation={currentLocation}
          isLocationSharing={isLocationSharing}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-2xl p-4 text-center">
          <Shield size={24} className="text-purple-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{userProfile?.safetyScore || 100}</p>
          <p className="text-slate-400 text-sm">Safety Score</p>
        </div>

        <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30 rounded-2xl p-4 text-center">
          <Zap size={24} className="text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{userProfile?.totalRewards || 0}</p>
          <p className="text-slate-400 text-sm">CDT Tokens</p>
        </div>

        <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-2xl p-4 text-center">
          <Car size={24} className="text-blue-400 mx-auto mb-2" />
          <p className={`text-2xl font-bold ${getSpeedColor(currentLocation?.speed || 0)}`}>
            {currentLocation?.speed || 0}
          </p>
          <p className="text-slate-400 text-sm">Current Speed</p>
        </div>

        <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-2xl p-4 text-center">
          <Battery size={24} className="text-yellow-400 mx-auto mb-2" />
          <p className={`text-2xl font-bold ${getBatteryColor(currentLocation?.battery || 0)}`}>
            {currentLocation?.battery || 0}%
          </p>
          <p className="text-slate-400 text-sm">Battery Level</p>
        </div>
      </div>

      {/* Member Status Cards */}
      <div className="grid gap-4 mb-6">
        {allMembers.map((member) => (
          <div
            key={member.id}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {member.profilePicture ? (
                    <img 
                      src={member.profilePicture} 
                      alt={member.name}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-purple-500/50"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-500/20 rounded-full flex items-center justify-center border-2 border-purple-500/50">
                      <span className="text-purple-400 text-lg font-semibold">
                        {member.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-800 ${
                    member.isOnline ? 'bg-green-500' : 'bg-slate-600'
                  }`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{member.name}</h3>
                  <p className="text-slate-400">{member.lastSeen}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-slate-400">Safety</p>
                  <p className="text-sm font-semibold text-white">{member.safetyScore}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400">CDT</p>
                  <p className="text-sm font-semibold text-white">{member.totalRewards}</p>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Battery size={16} className={getBatteryColor(member.location.battery)} />
                  <span className={`text-sm font-semibold ${getBatteryColor(member.location.battery)}`}>
                    {member.location.battery}%
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Car size={16} className={getSpeedColor(member.location.speed)} />
                  <span className={`text-sm font-semibold ${getSpeedColor(member.location.speed)}`}>
                    {member.location.speed} mph
                  </span>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold text-center ${
                  member.location.isDriving 
                    ? 'bg-yellow-500/20 text-yellow-400' 
                    : 'bg-green-500/20 text-green-400'
                }`}>
                  {member.location.isDriving ? 'Driving' : 'Stationary'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Circle Info */}
      {userProfile?.circleCode && (
        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Users size={24} className="text-purple-400" />
              <div>
                <p className="text-slate-400 text-sm">Your Circle Code</p>
                <p className="text-2xl font-bold text-purple-400 font-mono">{userProfile.circleCode}</p>
              </div>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-slate-400 text-sm">Total Circle Rewards</p>
              <p className="text-2xl font-bold text-white">
                {allMembers.reduce((total, member) => total + member.totalRewards, 0)} CDT
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Speed Performance Alert */}
      {userProfile && userProfile.averageSpeed > 75 && (
        <div className="mt-6 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <Car size={24} className="text-red-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Speed Alert</h3>
              <p className="text-red-200">
                Your average speed is {Math.round(userProfile.averageSpeed)} mph. 
                Keep it under 65 mph to earn more rewards!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CircleScreen;