import React, { useState } from 'react';
import { MapPin, Shield, Users, Target, ArrowRight, AlertTriangle } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';

interface LocationSetupScreenProps {
  onComplete: () => void;
}

const LocationSetupScreen: React.FC<LocationSetupScreenProps> = ({ onComplete }) => {
  const { toggleLocationSharing, isLocationSharing } = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleEnableLocation = async () => {
    setLoading(true);
    try {
      await toggleLocationSharing();
      if (!isLocationSharing) {
        setStep(2);
      }
    } catch (error) {
      console.error('Failed to enable location:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-3xl mb-6 shadow-lg">
              <Shield size={36} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
              Welcome to GeoGuardian
            </h1>
            <p className="text-slate-400 text-xl">
              Your intelligent location safety companion
            </p>
          </div>

          {step === 1 && (
            <div className="space-y-8">
              {/* Features */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-2xl">
                  <MapPin size={32} className="text-purple-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Real-time Tracking</h3>
                  <p className="text-slate-400 text-sm">High-precision GPS monitoring with smart movement detection</p>
                </div>
                
                <div className="text-center p-6 bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-2xl">
                  <Users size={32} className="text-blue-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Circle Safety</h3>
                  <p className="text-slate-400 text-sm">Share location with trusted contacts and family members</p>
                </div>
                
                <div className="text-center p-6 bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-2xl">
                  <Target size={32} className="text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Smart Rewards</h3>
                  <p className="text-slate-400 text-sm">Earn tokens for safe driving and responsible behavior</p>
                </div>
              </div>

              {/* Location Permission */}
              <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle size={24} className="text-amber-400 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Location Access Required</h3>
                    <p className="text-amber-200 mb-4">
                      GeoGuardian needs access to your location to provide safety features, track movement accurately, 
                      and enable emergency services. Your location data is encrypted and only shared with your trusted circles.
                    </p>
                    <ul className="text-amber-200 text-sm space-y-1">
                      <li>• High-accuracy GPS for precise tracking</li>
                      <li>• Movement and speed detection for safety</li>
                      <li>• Emergency location sharing</li>
                      <li>• Battery-optimized background tracking</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={handleEnableLocation}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 disabled:cursor-not-allowed text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <MapPin size={20} />
                    Enable Location Services
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 text-center">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <Target size={40} className="text-green-400" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Location Enabled Successfully!</h2>
                <p className="text-slate-400 text-lg mb-6">
                  GeoGuardian is now tracking your location with high precision. 
                  You can start using all safety features and join circles.
                </p>
              </div>

              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">What's Next?</h3>
                <div className="text-left space-y-2 text-green-200">
                  <p>• Create or join safety circles with family and friends</p>
                  <p>• Set up emergency contacts and SOS features</p>
                  <p>• Start earning rewards for safe driving</p>
                  <p>• Customize your profile and privacy settings</p>
                </div>
              </div>

              <button
                onClick={handleComplete}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                Continue to GeoGuardian
                <ArrowRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationSetupScreen;