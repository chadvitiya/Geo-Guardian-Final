import React, { useState } from 'react';
import { 
  User, 
  Shield, 
  Trash2, 
  Camera, 
  Upload, 
  AlertTriangle,
  Save,
  Eye,
  EyeOff,
  Lock,
  Heart,
  Phone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';
import EmergencySetupModal from './EmergencySetupModal';

const SettingsScreen: React.FC = () => {
  const { userProfile, currentUser, updateUserProfile, deleteUserAccount } = useAuth();
  const { isLocationSharing, toggleLocationSharing } = useLocation();
  const [activeTab, setActiveTab] = useState<'profile' | 'emergency' | 'privacy' | 'account'>('profile');
  const [profilePicture, setProfilePicture] = useState(userProfile?.profilePicture || '');
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEmergencySetup, setShowEmergencySetup] = useState(false);

  const handleProfilePictureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicture(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateAvatarUrl = (name: string) => {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=128&background=8b5cf6&color=ffffff&bold=true&format=png`;
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const avatarUrl = profilePicture || generateAvatarUrl(displayName);
      await updateUserProfile({
        displayName,
        profilePicture: avatarUrl
      });
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    if (!deletePassword.trim()) {
      alert('Please enter your password to confirm account deletion');
      return;
    }

    setDeleting(true);
    try {
      await deleteUserAccount(deletePassword);
      alert('Account deleted successfully');
    } catch (error: any) {
      alert(error.message || 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'emergency', label: 'Emergency', icon: Heart },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'account', label: 'Account', icon: AlertTriangle },
  ];

  const hasEmergencyInfo = userProfile?.hasCompletedEmergencySetup && userProfile?.emergencyContacts.length > 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Emergency Setup Modal */}
      <EmergencySetupModal 
        isOpen={showEmergencySetup}
        onClose={() => setShowEmergencySetup(false)}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-300">Manage your GeoGuardian preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-800/50 rounded-xl sm:rounded-2xl p-1 mb-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-0 flex items-center justify-center gap-2 py-3 px-4 rounded-lg sm:rounded-xl font-semibold transition-colors text-sm sm:text-base ${
                activeTab === tab.id
                  ? 'bg-purple-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Profile Picture */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Profile Picture</h2>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-blue-500 border-4 border-slate-600 shadow-lg">
                  {profilePicture ? (
                    <img 
                      src={profilePicture} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : displayName ? (
                    <img 
                      src={generateAvatarUrl(displayName)} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera size={32} className="text-white" />
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-10 h-10 bg-purple-500 hover:bg-purple-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-colors">
                  <Upload size={20} className="text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-semibold text-white mb-2">Update Photo</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Upload a new profile picture or we'll generate one based on your name
                </p>
                <p className="text-xs text-slate-500">
                  Recommended: Square image, at least 200x200px
                </p>
              </div>
            </div>
          </div>

          {/* Display Name */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Display Name</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving || !displayName.trim()}
                className="w-full sm:w-auto bg-purple-500 hover:bg-purple-600 disabled:bg-slate-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={18} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'emergency' && (
        <div className="space-y-6">
          {/* Emergency Setup Status */}
          <div className={`border rounded-2xl sm:rounded-3xl p-4 sm:p-6 ${
            hasEmergencyInfo 
              ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30'
              : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30'
          }`}>
            <div className="flex items-start gap-3">
              <Heart size={24} className={hasEmergencyInfo ? 'text-green-400' : 'text-amber-400'} />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {hasEmergencyInfo ? 'Emergency Information Complete' : 'Emergency Setup Required'}
                </h3>
                <p className={`mb-4 ${hasEmergencyInfo ? 'text-green-200' : 'text-amber-200'}`}>
                  {hasEmergencyInfo 
                    ? 'Your emergency contacts and medical information are set up and ready.'
                    : 'Add emergency contacts and medical information to help first responders assist you better.'
                  }
                </p>
                <button
                  onClick={() => setShowEmergencySetup(true)}
                  className={`font-semibold py-2 px-4 rounded-xl transition-colors ${
                    hasEmergencyInfo
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                >
                  {hasEmergencyInfo ? 'Update Emergency Info' : 'Setup Emergency Info'}
                </button>
              </div>
            </div>
          </div>

          {/* Emergency Contacts Summary */}
          {hasEmergencyInfo && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Emergency Contacts</h3>
              <div className="space-y-3">
                {userProfile?.emergencyContacts.slice(0, 3).map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${contact.isPrimary ? 'bg-red-500' : 'bg-slate-500'}`} />
                      <div>
                        <h4 className="font-semibold text-white">{contact.name}</h4>
                        <p className="text-slate-400 text-sm">{contact.relationship}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-slate-400" />
                      <span className="text-slate-300 text-sm">{contact.phone}</span>
                    </div>
                  </div>
                ))}
                {(userProfile?.emergencyContacts.length || 0) > 3 && (
                  <p className="text-slate-400 text-sm text-center">
                    +{(userProfile?.emergencyContacts.length || 0) - 3} more contacts
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Medical Information Summary */}
          {hasEmergencyInfo && userProfile?.medicalInfo && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Medical Information</h3>
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
            </div>
          )}
        </div>
      )}

      {activeTab === 'privacy' && (
        <div className="space-y-6">
          {/* Location Sharing */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Location Sharing</h2>
                <p className="text-slate-400">
                  Control whether your location is shared with your circles
                </p>
              </div>
              <button
                onClick={toggleLocationSharing}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                  isLocationSharing
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-slate-600 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {isLocationSharing ? <Eye size={18} /> : <EyeOff size={18} />}
                {isLocationSharing ? 'Sharing Enabled' : 'Sharing Disabled'}
              </button>
            </div>
          </div>

          {/* Privacy Information */}
          <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <Shield size={24} className="text-blue-400 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Your Privacy Matters</h3>
                <div className="text-blue-200 space-y-2 text-sm">
                  <p>• Your location is encrypted and only shared with your trusted circles</p>
                  <p>• You can disable location sharing at any time</p>
                  <p>• Location history is automatically deleted after 30 days</p>
                  <p>• Emergency contacts can always see your location during SOS</p>
                  <p>• Medical information is only shared with emergency responders</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* Account Information */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-1">Email</label>
                <p className="text-slate-400">{currentUser?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-1">Circle Code</label>
                <p className="text-purple-400 font-mono text-lg">{userProfile?.circleCode}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-1">Member Since</label>
                <p className="text-slate-400">
                  {userProfile?.createdAt?.toLocaleDateString() || 'Unknown'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-1">Emergency Setup</label>
                <p className={`${hasEmergencyInfo ? 'text-green-400' : 'text-amber-400'}`}>
                  {hasEmergencyInfo ? 'Complete' : 'Incomplete'}
                </p>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle size={24} className="text-red-400 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Danger Zone</h3>
                <p className="text-red-200 text-sm">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
              </div>
            </div>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Delete Account
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-red-200 mb-2">
                    Type "DELETE" to confirm account deletion
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE here"
                    className="w-full px-4 py-3 bg-red-900/50 border border-red-500 rounded-xl text-white placeholder-red-300 focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-red-200 mb-2">
                    Enter your password to confirm
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-300" />
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-4 py-3 bg-red-900/50 border border-red-500 rounded-xl text-white placeholder-red-300 focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                      setDeletePassword('');
                    }}
                    className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || deleteConfirmText !== 'DELETE' || !deletePassword.trim()}
                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Trash2 size={18} />
                        Delete Forever
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsScreen;