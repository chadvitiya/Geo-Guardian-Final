import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
}

interface MedicalInfo {
  bloodType?: string;
  allergies: string[];
  medications: string[];
  medicalConditions: string[];
  emergencyNotes: string;
  doctorName?: string;
  doctorPhone?: string;
  insuranceInfo?: string;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  profilePicture?: string;
  circleCode?: string;
  joinedCircles: string[];
  createdAt: Date | undefined;
  safetyScore: number;
  totalRewards: number;
  weeklyRewards: number;
  monthlyRewards: number;
  safetyStreak: number;
  speedViolations: number;
  lastSpeedCheck: Date | undefined;
  averageSpeed: number;
  totalDrivingTime: number; // in minutes
  emergencyContacts: EmergencyContact[];
  medicalInfo: MedicalInfo;
  hasCompletedEmergencySetup: boolean;
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserEmail: string;
  toUserId: string;
  toUserName: string;
  circleCode: string;
  circleName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  friendRequests: FriendRequest[];
  login: (email: string, password: string, circleCode?: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, circleCode?: string, profilePicture?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  joinCircle: (circleCode: string) => Promise<void>;
  leaveCircle: (circleCode: string) => Promise<void>;
  sendFriendRequest: (userName: string) => Promise<void>;
  respondToFriendRequest: (requestId: string, accept: boolean) => Promise<void>;
  updateUserRewards: (speedData: { speed: number; duration: number }) => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateEmergencyInfo: (emergencyContacts: EmergencyContact[], medicalInfo: MedicalInfo) => Promise<void>;
  deleteUserAccount: (password: string) => Promise<void>;
  refreshFriendRequests: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateCircleCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const generateAvatarUrl = (name: string) => {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=128&background=8b5cf6&color=ffffff&bold=true&format=png`;
  };

  const createDefaultProfile = (user: User, displayName: string, profilePicture?: string) => {
    const userCircleCode = generateCircleCode();
    const now = new Date();
    const avatarUrl = profilePicture || generateAvatarUrl(displayName);
    
    return {
      uid: user.uid,
      email: user.email!,
      displayName,
      profilePicture: avatarUrl,
      circleCode: userCircleCode,
      joinedCircles: [userCircleCode],
      createdAt: now,
      safetyScore: 100,
      totalRewards: 0,
      weeklyRewards: 0,
      monthlyRewards: 0,
      safetyStreak: 0,
      speedViolations: 0,
      lastSpeedCheck: now,
      averageSpeed: 0,
      totalDrivingTime: 0,
      emergencyContacts: [],
      medicalInfo: {
        allergies: [],
        medications: [],
        medicalConditions: [],
        emergencyNotes: '',
      },
      hasCompletedEmergencySetup: false,
    };
  };

  const login = async (email: string, password: string, circleCode?: string) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
      
      // If circle code is provided, try to join the circle
      if (circleCode && circleCode.trim()) {
        setTimeout(async () => {
          try {
            await joinCircle(circleCode.trim().toUpperCase());
          } catch (error) {
            console.error('Error joining circle during login:', error);
          }
        }, 1000);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  const register = async (email: string, password: string, displayName: string, circleCode?: string, profilePicture?: string) => {
    try {
      setError(null);
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(user, { displayName });
      
      const localUserProfile = createDefaultProfile(user, displayName, profilePicture);

      // Profile for Firestore (with serverTimestamp)
      const firestoreUserProfile = {
        ...localUserProfile,
        createdAt: serverTimestamp(),
        lastSpeedCheck: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', user.uid), firestoreUserProfile);
      
      await setDoc(doc(db, 'circles', localUserProfile.circleCode), {
        code: localUserProfile.circleCode,
        name: `${displayName}'s Circle`,
        adminId: user.uid,
        members: [user.uid],
        createdAt: serverTimestamp(),
      });

      // If circle code is provided during registration, try to join that circle too
      if (circleCode && circleCode.trim()) {
        setTimeout(async () => {
          try {
            await joinCircle(circleCode.trim().toUpperCase());
          } catch (error) {
            console.error('Error joining circle during registration:', error);
          }
        }, 1000);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser || !userProfile) throw new Error('User not authenticated');

    try {
      setError(null);
      
      // Update Firestore
      await updateDoc(doc(db, 'users', currentUser.uid), updates);
      
      // Update local state
      setUserProfile({
        ...userProfile,
        ...updates
      });

      // Update Firebase Auth profile if displayName is being updated
      if (updates.displayName) {
        await updateProfile(currentUser, { displayName: updates.displayName });
      }

    } catch (err: any) {
      console.error('Update profile error:', err);
      setError(err.message || 'Failed to update profile');
      throw err;
    }
  };

  const updateEmergencyInfo = async (emergencyContacts: EmergencyContact[], medicalInfo: MedicalInfo) => {
    if (!currentUser || !userProfile) throw new Error('User not authenticated');

    try {
      setError(null);
      
      const updates = {
        emergencyContacts,
        medicalInfo,
        hasCompletedEmergencySetup: true,
      };
      
      // Update Firestore
      await updateDoc(doc(db, 'users', currentUser.uid), updates);
      
      // Update local state
      setUserProfile({
        ...userProfile,
        ...updates
      });

    } catch (err: any) {
      console.error('Update emergency info error:', err);
      setError(err.message || 'Failed to update emergency information');
      throw err;
    }
  };

  const deleteUserAccount = async (password: string) => {
    if (!currentUser || !userProfile) throw new Error('User not authenticated');

    try {
      setError(null);
      
      // Re-authenticate user before deletion (required by Firebase for sensitive operations)
      const credential = EmailAuthProvider.credential(currentUser.email!, password);
      await reauthenticateWithCredential(currentUser, credential);
      
      // Delete user data from Firestore
      await deleteDoc(doc(db, 'users', currentUser.uid));
      
      // Remove user from all circles
      for (const circleCode of userProfile.joinedCircles) {
        try {
          const circleQuery = query(
            collection(db, 'circles'),
            where('code', '==', circleCode)
          );
          const circleSnapshot = await getDocs(circleQuery);
          
          if (!circleSnapshot.empty) {
            const circleDoc = circleSnapshot.docs[0];
            const circleData = circleDoc.data();
            
            if (circleData.adminId === currentUser.uid) {
              // If user is admin, delete the entire circle
              await deleteDoc(doc(db, 'circles', circleCode));
            } else {
              // Remove user from circle members
              const updatedMembers = circleData.members.filter((memberId: string) => memberId !== currentUser.uid);
              await updateDoc(doc(db, 'circles', circleCode), {
                members: updatedMembers
              });
            }
          }
        } catch (error) {
          console.error('Error removing user from circle:', error);
        }
      }
      
      // Delete user location data
      try {
        await deleteDoc(doc(db, 'userLocations', currentUser.uid));
      } catch (error) {
        console.error('Error deleting location data:', error);
      }
      
      // Delete friend requests
      try {
        const requestsQuery = query(
          collection(db, 'friendRequests'),
          where('fromUserId', '==', currentUser.uid)
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        
        for (const requestDoc of requestsSnapshot.docs) {
          await deleteDoc(requestDoc.ref);
        }
        
        const receivedRequestsQuery = query(
          collection(db, 'friendRequests'),
          where('toUserId', '==', currentUser.uid)
        );
        const receivedRequestsSnapshot = await getDocs(receivedRequestsQuery);
        
        for (const requestDoc of receivedRequestsSnapshot.docs) {
          await deleteDoc(requestDoc.ref);
        }
      } catch (error) {
        console.error('Error deleting friend requests:', error);
      }
      
      // Finally, delete the Firebase Auth user
      await deleteUser(currentUser);
      
    } catch (err: any) {
      console.error('Delete account error:', err);
      if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/requires-recent-login') {
        setError('Please log out and log back in, then try again.');
      } else {
        setError(err.message || 'Failed to delete account');
      }
      throw err;
    }
  };

  const joinCircle = async (circleCode: string) => {
    if (!currentUser || !userProfile) throw new Error('User not authenticated');

    try {
      setError(null);
      
      // Check if user is already in a circle (other than their own)
      if (userProfile.joinedCircles.length > 1) {
        throw new Error('You are already in a circle. Leave your current circle first.');
      }
      
      // Check if circle exists
      const circleQuery = query(
        collection(db, 'circles'),
        where('code', '==', circleCode)
      );
      const circleSnapshot = await getDocs(circleQuery);
      
      if (circleSnapshot.empty) {
        throw new Error('Circle not found');
      }

      const circleDoc = circleSnapshot.docs[0];
      const circleData = circleDoc.data();
      
      // Check if user is already in circle
      if (userProfile.joinedCircles.includes(circleCode)) {
        throw new Error('Already in this circle');
      }

      // Add user to circle
      const updatedMembers = [...circleData.members, currentUser.uid];
      await updateDoc(doc(db, 'circles', circleCode), {
        members: updatedMembers
      });

      // Update user profile
      const updatedCircles = [...userProfile.joinedCircles, circleCode];
      await updateDoc(doc(db, 'users', currentUser.uid), {
        joinedCircles: updatedCircles
      });

      // Update local state
      setUserProfile({
        ...userProfile,
        joinedCircles: updatedCircles
      });

    } catch (err: any) {
      console.error('Join circle error:', err);
      setError(err.message || 'Failed to join circle');
      throw err;
    }
  };

  const leaveCircle = async (circleCode: string) => {
    if (!currentUser || !userProfile) throw new Error('User not authenticated');

    try {
      setError(null);
      
      // Don't allow leaving own circle
      if (circleCode === userProfile.circleCode) {
        throw new Error('Cannot leave your own circle');
      }
      
      // Check if user is in this circle
      if (!userProfile.joinedCircles.includes(circleCode)) {
        throw new Error('You are not in this circle');
      }

      // Remove user from circle
      const circleQuery = query(
        collection(db, 'circles'),
        where('code', '==', circleCode)
      );
      const circleSnapshot = await getDocs(circleQuery);
      
      if (!circleSnapshot.empty) {
        const circleDoc = circleSnapshot.docs[0];
        const circleData = circleDoc.data();
        
        const updatedMembers = circleData.members.filter((memberId: string) => memberId !== currentUser.uid);
        await updateDoc(doc(db, 'circles', circleCode), {
          members: updatedMembers
        });
      }

      // Update user profile
      const updatedCircles = userProfile.joinedCircles.filter(code => code !== circleCode);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        joinedCircles: updatedCircles
      });

      // Update local state
      setUserProfile({
        ...userProfile,
        joinedCircles: updatedCircles
      });

    } catch (err: any) {
      console.error('Leave circle error:', err);
      setError(err.message || 'Failed to leave circle');
      throw err;
    }
  };

  const sendFriendRequest = async (userName: string) => {
    if (!currentUser || !userProfile) throw new Error('User not authenticated');

    try {
      setError(null);
      
      // Find user by display name (case-insensitive)
      const userQuery = query(
        collection(db, 'users'),
        where('displayName', '==', userName.trim())
      );
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        throw new Error('User not found. Please check the exact username.');
      }

      const targetUserDoc = userSnapshot.docs[0];
      const targetUserData = targetUserDoc.data();
      
      if (targetUserData.uid === currentUser.uid) {
        throw new Error('Cannot send friend request to yourself');
      }

      // Check if already in same circle
      const commonCircles = userProfile.joinedCircles.filter(circle => 
        targetUserData.joinedCircles?.includes(circle)
      );
      
      if (commonCircles.length > 0) {
        throw new Error('User is already in your circle');
      }

      // Check if request already exists (either direction)
      const existingRequestQuery1 = query(
        collection(db, 'friendRequests'),
        where('fromUserId', '==', currentUser.uid),
        where('toUserId', '==', targetUserData.uid),
        where('status', '==', 'pending')
      );
      const existingRequestSnapshot1 = await getDocs(existingRequestQuery1);
      
      const existingRequestQuery2 = query(
        collection(db, 'friendRequests'),
        where('fromUserId', '==', targetUserData.uid),
        where('toUserId', '==', currentUser.uid),
        where('status', '==', 'pending')
      );
      const existingRequestSnapshot2 = await getDocs(existingRequestQuery2);
      
      if (!existingRequestSnapshot1.empty) {
        throw new Error('Friend request already sent to this user');
      }
      
      if (!existingRequestSnapshot2.empty) {
        throw new Error('This user has already sent you a friend request');
      }

      // Create friend request
      const requestData = {
        fromUserId: currentUser.uid,
        fromUserName: userProfile.displayName,
        fromUserEmail: userProfile.email,
        toUserId: targetUserData.uid,
        toUserName: targetUserData.displayName,
        circleCode: userProfile.circleCode,
        circleName: `${userProfile.displayName}'s Circle`,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'friendRequests'), requestData);
      console.log('Friend request sent successfully');

    } catch (err: any) {
      console.error('Send friend request error:', err);
      setError(err.message || 'Failed to send friend request');
      throw err;
    }
  };

  const respondToFriendRequest = async (requestId: string, accept: boolean) => {
    if (!currentUser || !userProfile) throw new Error('User not authenticated');

    try {
      setError(null);
      
      // Get the friend request
      const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));
      if (!requestDoc.exists()) {
        throw new Error('Friend request not found');
      }

      const requestData = requestDoc.data();
      
      if (accept) {
        // Check if user is already in multiple circles
        if (userProfile.joinedCircles.length > 1) {
          throw new Error('You are already in a circle. Leave your current circle first.');
        }
        
        // Add current user to the requester's circle
        const circleCode = requestData.circleCode;
        
        // Update circle members
        const circleQuery = query(
          collection(db, 'circles'),
          where('code', '==', circleCode)
        );
        const circleSnapshot = await getDocs(circleQuery);
        
        if (!circleSnapshot.empty) {
          const circleDoc = circleSnapshot.docs[0];
          const circleData = circleDoc.data();
          
          const updatedMembers = [...circleData.members, currentUser.uid];
          await updateDoc(doc(db, 'circles', circleCode), {
            members: updatedMembers
          });

          // Update user's joined circles
          const updatedCircles = [...userProfile.joinedCircles, circleCode];
          await updateDoc(doc(db, 'users', currentUser.uid), {
            joinedCircles: updatedCircles
          });

          // Update local state
          setUserProfile({
            ...userProfile,
            joinedCircles: updatedCircles
          });
        }
      }

      // Update request status
      await updateDoc(doc(db, 'friendRequests', requestId), {
        status: accept ? 'accepted' : 'rejected'
      });

      // Remove from local state
      setFriendRequests(prev => prev.filter(req => req.id !== requestId));

    } catch (err: any) {
      console.error('Respond to friend request error:', err);
      setError(err.message || 'Failed to respond to friend request');
      throw err;
    }
  };

  const refreshFriendRequests = async () => {
    if (!currentUser) return;

    try {
      const requestsQuery = query(
        collection(db, 'friendRequests'),
        where('toUserId', '==', currentUser.uid),
        where('status', '==', 'pending')
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      
      const requests: FriendRequest[] = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as FriendRequest[];

      setFriendRequests(requests);
      console.log('Friend requests refreshed:', requests.length);
    } catch (error) {
      console.error('Error refreshing friend requests:', error);
    }
  };

  const updateUserRewards = async (speedData: { speed: number; duration: number }) => {
    if (!currentUser || !userProfile) return;

    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const lastCheck = userProfile.lastSpeedCheck || new Date(0);
      const lastMonth = lastCheck.getMonth();

      // Reset monthly data if new month
      let monthlyRewards = userProfile.monthlyRewards;
      let speedViolations = userProfile.speedViolations;
      if (currentMonth !== lastMonth) {
        monthlyRewards = 0;
        speedViolations = 0;
      }

      // Calculate new average speed
      const totalTime = userProfile.totalDrivingTime + speedData.duration;
      const newAverageSpeed = totalTime > 0 
        ? ((userProfile.averageSpeed * userProfile.totalDrivingTime) + (speedData.speed * speedData.duration)) / totalTime
        : speedData.speed;

      let rewardChange = 0;
      let safetyScoreChange = 0;
      let newSpeedViolations = speedViolations;

      // Enhanced speed-based rewards and penalties
      if (speedData.speed <= 65) {
        // Reward for staying under 65 mph
        rewardChange = Math.floor(speedData.duration / 60) * 8; // 8 CDT per minute under 65
        safetyScoreChange = 0.2;
      } else if (speedData.speed > 75) {
        // Penalty for going over 75 mph
        rewardChange = -Math.floor(speedData.duration / 60) * 15; // -15 CDT per minute over 75
        safetyScoreChange = -0.8;
        newSpeedViolations += 1;
      } else if (speedData.speed > 65) {
        // Mild penalty for 65-75 mph
        rewardChange = -Math.floor(speedData.duration / 60) * 3; // -3 CDT per minute 65-75
        safetyScoreChange = -0.1;
      }

      // Running/walking speed consideration (3-15 mph range)
      if (speedData.speed >= 3 && speedData.speed <= 15) {
        // Reward for running/walking
        rewardChange = Math.floor(speedData.duration / 60) * 5; // 5 CDT per minute for exercise
        safetyScoreChange = 0.1;
      }

      // Monthly average speed bonus/penalty
      if (totalTime >= 30 * 60) { // At least 30 hours of driving
        if (newAverageSpeed <= 65) {
          rewardChange += 150; // Monthly bonus
        } else if (newAverageSpeed > 75) {
          rewardChange -= 300; // Monthly penalty
        }
      }

      const updatedProfile = {
        ...userProfile,
        totalRewards: Math.max(0, userProfile.totalRewards + rewardChange),
        weeklyRewards: userProfile.weeklyRewards + Math.max(0, rewardChange),
        monthlyRewards: monthlyRewards + Math.max(0, rewardChange),
        safetyScore: Math.max(0, Math.min(100, userProfile.safetyScore + safetyScoreChange)),
        speedViolations: newSpeedViolations,
        averageSpeed: newAverageSpeed,
        totalDrivingTime: totalTime,
        lastSpeedCheck: now,
      };

      // Update Firestore with serverTimestamp
      await updateDoc(doc(db, 'users', currentUser.uid), {
        ...updatedProfile,
        lastSpeedCheck: serverTimestamp(),
      });
      
      setUserProfile(updatedProfile);

    } catch (error) {
      console.error('Error updating user rewards:', error);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (err: any) {
      console.error('Logout error:', err);
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(getErrorMessage(err.code));
      throw err;
    }
  };

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/operation-not-allowed':
        return 'Email/password authentication is not enabled. Please contact support.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return 'An error occurred. Please try again.';
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Convert Firestore Timestamps to Date objects for local state
            const userProfile: UserProfile = {
              ...userData,
              createdAt: userData.createdAt?.toDate?.() || new Date(),
              lastSpeedCheck: userData.lastSpeedCheck?.toDate?.() || new Date(),
              emergencyContacts: userData.emergencyContacts || [],
              medicalInfo: userData.medicalInfo || {
                allergies: [],
                medications: [],
                medicalConditions: [],
                emergencyNotes: '',
              },
              hasCompletedEmergencySetup: userData.hasCompletedEmergencySetup || false,
            } as UserProfile;
            
            setUserProfile(userProfile);
            
            // Load friend requests immediately
            await refreshFriendRequests();
          } else {
            // Create profile for existing users
            const localUserProfile = createDefaultProfile(user, user.displayName || 'User');
            
            // Profile for Firestore (with serverTimestamp)
            const firestoreUserProfile = {
              ...localUserProfile,
              createdAt: serverTimestamp(),
              lastSpeedCheck: serverTimestamp(),
            };
            
            await setDoc(doc(db, 'users', user.uid), firestoreUserProfile);
            await setDoc(doc(db, 'circles', localUserProfile.circleCode), {
              code: localUserProfile.circleCode,
              name: `${user.displayName || 'User'}'s Circle`,
              adminId: user.uid,
              members: [user.uid],
              createdAt: serverTimestamp(),
            });
            
            setUserProfile(localUserProfile);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserProfile(null);
        setFriendRequests([]);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Set up real-time listener for friend requests
  useEffect(() => {
    if (currentUser) {
      const requestsQuery = query(
        collection(db, 'friendRequests'),
        where('toUserId', '==', currentUser.uid),
        where('status', '==', 'pending')
      );

      const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
        const requests: FriendRequest[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as FriendRequest[];

        setFriendRequests(requests);
        console.log('Real-time friend requests update:', requests.length);
      }, (error) => {
        console.error('Error listening to friend requests:', error);
      });

      return () => unsubscribe();
    }
  }, [currentUser]);

  const value = {
    currentUser,
    userProfile,
    friendRequests,
    login,
    register,
    logout,
    resetPassword,
    joinCircle,
    leaveCircle,
    sendFriendRequest,
    respondToFriendRequest,
    updateUserRewards,
    updateUserProfile,
    updateEmergencyInfo,
    deleteUserAccount,
    refreshFriendRequests,
    loading,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};