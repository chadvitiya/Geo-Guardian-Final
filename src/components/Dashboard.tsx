import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Map, 
  Users, 
  Trophy, 
  AlertTriangle, 
  LogOut,
  Menu,
  X,
  Bell,
  Settings,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation as useLocationContext } from '../contexts/LocationContext';
import CircleScreen from './CircleScreen';
import LocationScreen from './LocationScreen';
import MembersScreen from './MembersScreen';
import RewardsScreen from './RewardsScreen';
import SOSScreen from './SOSScreen';
import SettingsScreen from './SettingsScreen';
import LocationSetupScreen from './LocationSetupScreen';
import EmergencySetupModal from './EmergencySetupModal';

const Dashboard: React.FC = () => {
  const { logout, userProfile, friendRequests } = useAuth();
  const { isLocationSharing } = useLocationContext();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLocationSetup, setShowLocationSetup] = useState(false);
  const [showEmergencySetup, setShowEmergencySetup] = useState(false);

  // Check if user needs location setup
  useEffect(() => {
    if (userProfile && !isLocationSharing) {
      setShowLocationSetup(true);
    }
  }, [userProfile, isLocationSharing]);

  // Check if user needs emergency setup
  useEffect(() => {
    if (userProfile && isLocationSharing && !userProfile.hasCompletedEmergencySetup) {
      // Show emergency setup after a short delay to let location setup complete
      const timer = setTimeout(() => {
        setShowEmergencySetup(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [userProfile, isLocationSharing]);

  const navigation = [
    { name: 'Guardian', href: '/dashboard', icon: Shield },
    { name: 'Location', href: '/dashboard/location', icon: Map },
    { 
      name: 'Members', 
      href: '/dashboard/members', 
      icon: Users,
      badge: friendRequests.length > 0 ? friendRequests.length : undefined
    },
    { name: 'Rewards', href: '/dashboard/rewards', icon: Trophy },
    { name: 'SOS', href: '/dashboard/sos', icon: AlertTriangle },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (showLocationSetup) {
    return (
      <LocationSetupScreen 
        onComplete={() => setShowLocationSetup(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex">
      {/* Emergency Setup Modal */}
      <EmergencySetupModal 
        isOpen={showEmergencySetup}
        onClose={() => setShowEmergencySetup(false)}
      />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Enhanced Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-gradient-to-b from-slate-800/95 to-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-20 px-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">GeoGuardian</h1>
              <p className="text-xs text-slate-400">Safety First</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-slate-700/50"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="mt-8 px-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || 
              (item.href === '/dashboard' && location.pathname === '/dashboard');
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-4 px-5 py-4 rounded-2xl text-lg font-medium transition-all mb-2 relative group
                  ${isActive 
                    ? 'bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-white border border-purple-500/50 shadow-lg' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }
                `}
              >
                <Icon size={24} />
                {item.name}
                {item.badge && (
                  <span className="ml-auto bg-red-500 text-white text-sm px-3 py-1 rounded-full min-w-[24px] h-6 flex items-center justify-center font-bold shadow-lg animate-pulse">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-purple-500 to-blue-500 rounded-l-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Enhanced User Profile Section */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-700/50 bg-gradient-to-t from-slate-900/80 to-transparent backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              {userProfile?.profilePicture ? (
                <img 
                  src={userProfile.profilePicture} 
                  alt="Profile"
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-purple-500/50 shadow-lg"
                />
              ) : (
                <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center border-2 border-purple-500/50 shadow-lg">
                  <span className="text-white text-xl font-bold">
                    {userProfile?.displayName?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-800 shadow-lg" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold text-white truncate">
                {userProfile?.displayName || 'User'}
              </p>
              <p className="text-sm text-slate-400 truncate">
                Safety Score: {userProfile?.safetyScore || 100}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-lg text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-2xl transition-all font-medium"
          >
            <LogOut size={20} />
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Enhanced Mobile header */}
        <div className="lg:hidden flex items-center justify-between h-20 px-6 bg-gradient-to-r from-slate-800/95 to-slate-900/95 backdrop-blur-xl border-b border-slate-700/50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-slate-700/50"
          >
            <Menu size={28} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">GeoGuardian</h1>
            </div>
          </div>
          <div className="relative">
            {friendRequests.length > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] h-5 flex items-center justify-center font-bold animate-pulse">
                {friendRequests.length}
              </div>
            )}
            <Bell size={24} className="text-slate-400" />
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<CircleScreen />} />
            <Route path="/location" element={<LocationScreen />} />
            <Route path="/members" element={<MembersScreen />} />
            <Route path="/rewards" element={<RewardsScreen />} />
            <Route path="/sos" element={<SOSScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;