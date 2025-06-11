import React, { useState, useEffect } from 'react';
import { Users, Shield, Plus, Crown, CheckCircle, RefreshCw, UserPlus, X, Check, Bell, LogOut, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';

const MembersScreen: React.FC = () => {
  const { userProfile, currentUser, sendFriendRequest, friendRequests, respondToFriendRequest, refreshFriendRequests, leaveCircle } = useAuth();
  const { circleMembers, refreshCircleMembers } = useLocation();
  const [loading, setLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUserName, setInviteUserName] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveCircleCode, setLeaveCircleCode] = useState('');

  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([refreshCircleMembers(), refreshFriendRequests()]);
    setLoading(false);
  };

  const handleSendInvite = async () => {
    if (!inviteUserName.trim() || inviteLoading) return;
    
    setInviteLoading(true);
    setInviteError('');
    
    try {
      await sendFriendRequest(inviteUserName.trim());
      setInviteUserName('');
      setShowInviteModal(false);
      alert('Friend request sent successfully!');
    } catch (error: any) {
      setInviteError(error.message || 'Failed to send friend request');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRespondToRequest = async (requestId: string, accept: boolean) => {
    try {
      await respondToFriendRequest(requestId, accept);
      if (accept) {
        // Refresh circle members after accepting
        setTimeout(refreshCircleMembers, 1000);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to respond to friend request');
    }
  };

  const handleLeaveCircle = async () => {
    if (!leaveCircleCode) return;
    
    try {
      await leaveCircle(leaveCircleCode);
      setShowLeaveModal(false);
      setLeaveCircleCode('');
      alert('Successfully left the circle!');
      // Refresh circle members after leaving
      setTimeout(refreshCircleMembers, 1000);
    } catch (error: any) {
      alert(error.message || 'Failed to leave circle');
    }
  };

  const canJoinCircle = userProfile?.joinedCircles.length === 1;
  const joinedOtherCircles = userProfile?.joinedCircles.filter(code => code !== userProfile.circleCode) || [];

  useEffect(() => {
    refreshCircleMembers();
    refreshFriendRequests();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 95) return 'text-green-500';
    if (score >= 85) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Include current user in the members list
  const allMembers = [
    {
      id: currentUser?.uid || 'current',
      name: 'You',
      email: currentUser?.email || '',
      role: 'admin' as const,
      joinedDate: userProfile?.createdAt || new Date(),
      safetyScore: userProfile?.safetyScore || 100,
      totalRewards: userProfile?.totalRewards || 0,
      isOnline: true,
      speedViolations: userProfile?.speedViolations || 0,
      averageSpeed: userProfile?.averageSpeed || 0,
    },
    ...circleMembers.map(member => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: 'member' as const,
      joinedDate: new Date(), // We don't have this data from circleMembers
      safetyScore: member.safetyScore,
      totalRewards: member.totalRewards,
      isOnline: member.isOnline,
      speedViolations: 0, // We don't have this data
      averageSpeed: 0, // We don't have this data
    }))
  ];

  const avgSafetyScore = allMembers.length > 0 
    ? Math.round(allMembers.reduce((acc, m) => acc + m.safetyScore, 0) / allMembers.length)
    : 0;

  const totalRewards = allMembers.reduce((acc, m) => acc + m.totalRewards, 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Circle Members</h1>
            <p className="text-slate-300">{allMembers.length}/8 members</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleRefresh}
              disabled={loading}
              className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center hover:bg-slate-600/50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={20} className={`text-white ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="relative group">
              <button 
                onClick={() => canJoinCircle ? setShowInviteModal(true) : null}
                disabled={!canJoinCircle}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  canJoinCircle 
                    ? 'bg-purple-500/30 border border-purple-500/50 hover:bg-purple-500/40' 
                    : 'bg-slate-600/50 border border-slate-500/50 cursor-not-allowed'
                }`}
              >
                <UserPlus size={20} className={canJoinCircle ? 'text-white' : 'text-slate-400'} />
              </button>
              {!canJoinCircle && (
                <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  You are already in a circle. Leave first to join another.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Circle Status */}
      {joinedOtherCircles.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Circle Status</h3>
                <p className="text-amber-200">
                  You are in {joinedOtherCircles.length + 1} circle{joinedOtherCircles.length > 0 ? 's' : ''}. 
                  Leave other circles to join new ones.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <LogOut size={16} />
              Leave Circle
            </button>
          </div>
        </div>
      )}

      {/* Friend Requests */}
      {friendRequests.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={20} className="text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Friend Requests</h2>
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              {friendRequests.length}
            </span>
          </div>
          <div className="space-y-3">
            {friendRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                <div>
                  <h3 className="font-semibold text-white">{request.fromUserName}</h3>
                  <p className="text-slate-400 text-sm">
                    Wants to add you to "{request.circleName}"
                  </p>
                  <p className="text-slate-500 text-xs">{request.fromUserEmail}</p>
                  <p className="text-blue-400 text-xs mt-1">
                    This will add you to their circle
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespondToRequest(request.id, true)}
                    className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center hover:bg-green-500/30 transition-colors"
                  >
                    <Check size={16} className="text-green-400" />
                  </button>
                  <button
                    onClick={() => handleRespondToRequest(request.id, false)}
                    className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center hover:bg-red-500/30 transition-colors"
                  >
                    <X size={16} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <Users size={24} className="text-purple-400" />
            <div>
              <p className="text-3xl font-bold text-white">{allMembers.length}</p>
              <p className="text-slate-400">Active Members</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-green-400" />
            <div>
              <p className="text-3xl font-bold text-white">{avgSafetyScore}</p>
              <p className="text-slate-400">Avg Safety Score</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <CheckCircle size={24} className="text-yellow-400" />
            <div>
              <p className="text-3xl font-bold text-white">{totalRewards}</p>
              <p className="text-slate-400">Total CDT Earned</p>
            </div>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-4 mb-6">
        {allMembers.map((member) => (
          <div
            key={member.id}
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <span className="text-purple-400 text-lg font-semibold">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-800 ${
                    member.isOnline ? 'bg-green-500' : 'bg-slate-600'
                  }`} />
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{member.name}</h3>
                    {member.role === 'admin' && (
                      <Crown size={16} className="text-yellow-500" />
                    )}
                  </div>
                  <p className="text-slate-400 text-sm">{member.email}</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-1">Safety Score</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`text-2xl font-bold ${getScoreColor(member.safetyScore)}`}>
                    {member.safetyScore}
                  </span>
                  <span className="text-slate-400">/100</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-slate-400 text-sm mb-1">Total Rewards</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-2xl font-bold text-white">{member.totalRewards}</span>
                  <span className="text-slate-400">CDT</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-slate-400 text-sm mb-1">Speed Violations</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`text-2xl font-bold ${member.speedViolations > 5 ? 'text-red-500' : 'text-green-500'}`}>
                    {member.speedViolations}
                  </span>
                  <span className="text-slate-400">this month</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-slate-400 text-sm mb-1">Avg Speed</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`text-2xl font-bold ${
                    member.averageSpeed <= 65 ? 'text-green-500' : 
                    member.averageSpeed <= 75 ? 'text-yellow-500' : 'text-red-500'
                  }`}>
                    {Math.round(member.averageSpeed)}
                  </span>
                  <span className="text-slate-400">mph</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Invite Card */}
      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl p-8 text-center">
        <Plus size={32} className="text-purple-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Invite New Member</h3>
        <p className="text-slate-400 mb-4">
          Share your circle code: <span className="font-mono text-purple-400">{userProfile?.circleCode}</span>
        </p>
        <div className="flex gap-3 justify-center">
          <button 
            onClick={() => navigator.clipboard.writeText(userProfile?.circleCode || '')}
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Copy Circle Code
          </button>
          <div className="relative group">
            <button 
              onClick={() => canJoinCircle ? setShowInviteModal(true) : null}
              disabled={!canJoinCircle}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                canJoinCircle 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                  : 'bg-slate-600 text-slate-400 cursor-not-allowed'
              }`}
            >
              Send Friend Request
            </button>
            {!canJoinCircle && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                You cannot join since you are in a circle
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Send Friend Request</h2>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteError('');
                  setInviteUserName('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  User Name
                </label>
                <input
                  type="text"
                  value={inviteUserName}
                  onChange={(e) => setInviteUserName(e.target.value)}
                  placeholder="Enter exact username"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Enter the exact display name of the user you want to invite
                </p>
                <p className="text-xs text-blue-400 mt-1">
                  This will add them to your circle
                </p>
              </div>

              {inviteError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  <p className="text-red-400 text-sm">{inviteError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteError('');
                    setInviteUserName('');
                  }}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-3 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendInvite}
                  disabled={inviteLoading || !inviteUserName.trim()}
                  className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-600 text-white py-3 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed"
                >
                  {inviteLoading ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Circle Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Leave Circle</h2>
              <button
                onClick={() => {
                  setShowLeaveModal(false);
                  setLeaveCircleCode('');
                }}
                className="text-slate-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">
                  Select Circle to Leave
                </label>
                <select
                  value={leaveCircleCode}
                  onChange={(e) => setLeaveCircleCode(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select a circle</option>
                  {joinedOtherCircles.map((code) => (
                    <option key={code} value={code}>
                      Circle {code}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  You cannot leave your own circle ({userProfile?.circleCode})
                </p>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                <p className="text-red-400 text-sm">
                  Warning: Leaving a circle will remove you from all shared activities and rewards tracking with that group.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowLeaveModal(false);
                    setLeaveCircleCode('');
                  }}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-3 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLeaveCircle}
                  disabled={!leaveCircleCode}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 text-white py-3 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed"
                >
                  Leave Circle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersScreen;