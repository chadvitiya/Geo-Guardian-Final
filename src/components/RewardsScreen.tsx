import React, { useState, useEffect } from 'react';
import { Diamond, TrendingUp, Trophy, Star, Zap, Shield, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from '../contexts/LocationContext';

interface Reward {
  id: string;
  title: string;
  description: string;
  amount: number;
  date: Date;
  type: 'safe_driving' | 'speed_limit' | 'milestone' | 'bonus';
}

interface LeaderboardEntry {
  id: string;
  name: string;
  rewards: number;
  safetyScore: number;
  averageSpeed: number;
  speedViolations: number;
}

const RewardsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'achievements'>('overview');
  const { userProfile, currentUser } = useAuth();
  const { circleMembers, refreshCircleMembers } = useLocation();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  
  const generateRecentRewards = (): Reward[] => {
    if (!userProfile) return [];
    
    const rewards: Reward[] = [];
    const now = new Date();
    
    // Generate rewards based on user's average speed
    if (userProfile.averageSpeed <= 65 && userProfile.totalDrivingTime > 60) {
      rewards.push({
        id: '1',
        title: 'Speed Limit Champion',
        description: `Maintained average speed of ${Math.round(userProfile.averageSpeed)} mph`,
        amount: 50,
        date: new Date(now.getTime() - 3600000), // 1 hour ago
        type: 'speed_limit',
      });
    }
    
    if (userProfile.safetyScore >= 95) {
      rewards.push({
        id: '2',
        title: 'Safe Driving Bonus',
        description: `Excellent safety score of ${userProfile.safetyScore}`,
        amount: 25,
        date: new Date(now.getTime() - 7200000), // 2 hours ago
        type: 'safe_driving',
      });
    }
    
    if (userProfile.speedViolations === 0 && userProfile.totalDrivingTime > 30) {
      rewards.push({
        id: '3',
        title: 'Zero Violations',
        description: 'No speed violations this month',
        amount: 75,
        date: new Date(now.getTime() - 86400000), // 1 day ago
        type: 'milestone',
      });
    }
    
    return rewards;
  };

  const buildLeaderboard = () => {
    const members: LeaderboardEntry[] = [];
    
    // Add current user
    if (userProfile && currentUser) {
      members.push({
        id: currentUser.uid,
        name: 'You',
        rewards: userProfile.totalRewards,
        safetyScore: userProfile.safetyScore,
        averageSpeed: userProfile.averageSpeed,
        speedViolations: userProfile.speedViolations,
      });
    }
    
    // Add circle members
    circleMembers.forEach(member => {
      members.push({
        id: member.id,
        name: member.name,
        rewards: member.totalRewards,
        safetyScore: member.safetyScore,
        averageSpeed: 0, // We don't have this data from circleMembers
        speedViolations: 0, // We don't have this data from circleMembers
      });
    });
    
    // Sort by total rewards
    members.sort((a, b) => b.rewards - a.rewards);
    
    setLeaderboard(members);
  };

  const handleRefresh = async () => {
    setLoading(true);
    await refreshCircleMembers();
    buildLeaderboard();
    setLoading(false);
  };

  useEffect(() => {
    buildLeaderboard();
  }, [userProfile, circleMembers]);

  const recentRewards = generateRecentRewards();

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'speed_limit': return Zap;
      case 'safe_driving': return Shield;
      case 'milestone': return Trophy;
      default: return Diamond;
    }
  };

  const getRewardColor = (type: string) => {
    switch (type) {
      case 'speed_limit': return 'text-green-500';
      case 'safe_driving': return 'text-blue-500';
      case 'milestone': return 'text-yellow-500';
      default: return 'text-purple-500';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'achievements', label: 'Achievements' },
  ];

  const userRank = leaderboard.findIndex(member => member.id === currentUser?.uid) + 1;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Rewards Dashboard</h1>
            <p className="text-slate-300">Web3 incentives for safe driving</p>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={loading}
            className="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center hover:bg-slate-600/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={20} className={`text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-800/50 rounded-xl p-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-purple-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-6 text-center">
              <Diamond size={24} className="text-purple-400 mx-auto mb-3" />
              <p className="text-2xl font-bold text-white">{userProfile?.totalRewards || 0}</p>
              <p className="text-slate-400 text-sm">CDT Tokens</p>
            </div>

            <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-6 text-center">
              <TrendingUp size={24} className="text-green-400 mx-auto mb-3" />
              <p className="text-2xl font-bold text-white">+{userProfile?.weeklyRewards || 0}</p>
              <p className="text-slate-400 text-sm">This Week</p>
            </div>

            <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-xl p-6 text-center">
              <Trophy size={24} className="text-yellow-400 mx-auto mb-3" />
              <p className="text-2xl font-bold text-white">#{userRank || '-'}</p>
              <p className="text-slate-400 text-sm">Circle Rank</p>
            </div>

            <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-xl p-6 text-center">
              <Star size={24} className="text-red-400 mx-auto mb-3" />
              <p className="text-2xl font-bold text-white">{userProfile?.safetyStreak || 0}</p>
              <p className="text-slate-400 text-sm">Day Streak</p>
            </div>
          </div>

          {/* Speed Performance */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Speed Performance</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-2">Average Speed</p>
                <p className={`text-3xl font-bold ${
                  (userProfile?.averageSpeed || 0) <= 65 ? 'text-green-500' : 
                  (userProfile?.averageSpeed || 0) <= 75 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {Math.round(userProfile?.averageSpeed || 0)} mph
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {(userProfile?.averageSpeed || 0) <= 65 ? 'Excellent!' : 
                   (userProfile?.averageSpeed || 0) <= 75 ? 'Good' : 'Needs improvement'}
                </p>
              </div>
              
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-2">Speed Violations</p>
                <p className={`text-3xl font-bold ${
                  (userProfile?.speedViolations || 0) === 0 ? 'text-green-500' : 
                  (userProfile?.speedViolations || 0) <= 3 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {userProfile?.speedViolations || 0}
                </p>
                <p className="text-xs text-slate-500 mt-1">This month</p>
              </div>
              
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-2">Driving Time</p>
                <p className="text-3xl font-bold text-white">
                  {Math.round((userProfile?.totalDrivingTime || 0) / 60)}h
                </p>
                <p className="text-xs text-slate-500 mt-1">Total tracked</p>
              </div>
            </div>
          </div>

          {/* Recent Rewards */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Recent Rewards</h2>
            {recentRewards.length > 0 ? (
              <div className="space-y-4">
                {recentRewards.map((reward) => {
                  const IconComponent = getRewardIcon(reward.type);
                  return (
                    <div key={reward.id} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-600/50 rounded-full flex items-center justify-center">
                          <IconComponent size={20} className={getRewardColor(reward.type)} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{reward.title}</h3>
                          <p className="text-slate-400 text-sm">{reward.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-400">+{reward.amount}</p>
                        <p className="text-slate-400 text-xs">CDT</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400">No recent rewards</p>
                <p className="text-slate-500 text-sm mt-2">Start driving safely to earn CDT tokens!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Circle Leaderboard</h2>
          <div className="space-y-4">
            {leaderboard.map((member, index) => (
              <div
                key={member.id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  index === 0 
                    ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30'
                    : 'bg-slate-700/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${index === 0 ? 'text-yellow-400' : 'text-white'}`}>
                      #{index + 1}
                    </span>
                    {index === 0 && <Trophy size={16} className="text-yellow-400" />}
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-white">{member.name}</h3>
                    <p className="text-slate-400 text-sm">Safety Score: {member.safetyScore}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{member.rewards}</p>
                  <p className="text-slate-400 text-xs">CDT</p>
                </div>
              </div>
            ))}
          </div>
          {leaderboard.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-400">No leaderboard data available</p>
              <p className="text-slate-500 text-sm mt-2">Invite friends to your circle to compete!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Achievements</h2>
          <div className="space-y-6">
            {/* Speed Guardian Achievement */}
            <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🛡️</span>
                  <div>
                    <h3 className="font-semibold text-white">Speed Guardian</h3>
                    <p className="text-slate-400 text-sm">Maintain average speed under 65 mph</p>
                  </div>
                </div>
                <Trophy size={24} className="text-green-400" />
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-700/50 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${Math.min(100, ((userProfile?.averageSpeed || 0) <= 65 && (userProfile?.totalDrivingTime || 0) > 0) ? 100 : 0)}%` 
                    }} 
                  />
                </div>
                <span className="text-slate-400 text-sm">
                  {(userProfile?.averageSpeed || 0) <= 65 && (userProfile?.totalDrivingTime || 0) > 0 ? 'Complete!' : 'In Progress'}
                </span>
              </div>
            </div>

            {/* Safety First Achievement */}
            <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⭐</span>
                  <div>
                    <h3 className="font-semibold text-white">Safety First</h3>
                    <p className="text-slate-400 text-sm">Maintain safety score above 95</p>
                  </div>
                </div>
                <Trophy size={24} className="text-blue-400" />
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-700/50 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${Math.min(100, ((userProfile?.safetyScore || 0) / 95) * 100)}%` 
                    }} 
                  />
                </div>
                <span className="text-slate-400 text-sm">
                  {userProfile?.safetyScore || 0}/95
                </span>
              </div>
            </div>

            {/* Zero Violations Achievement */}
            <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <h3 className="font-semibold text-white">Perfect Record</h3>
                    <p className="text-slate-400 text-sm">Complete a month with zero speed violations</p>
                  </div>
                </div>
                <Trophy size={24} className="text-purple-400" />
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-700/50 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${(userProfile?.speedViolations || 0) === 0 && (userProfile?.totalDrivingTime || 0) > 30 * 60 ? 100 : 0}%` 
                    }} 
                  />
                </div>
                <span className="text-slate-400 text-sm">
                  {(userProfile?.speedViolations || 0)} violations this month
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RewardsScreen;