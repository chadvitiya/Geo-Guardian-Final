import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, AlertTriangle, Users, Camera, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthFormProps {
  mode?: 'login' | 'register' | 'forgot';
}

const AuthForm: React.FC<AuthFormProps> = ({ mode: initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [circleCode, setCircleCode] = useState('');
  const [profilePicture, setProfilePicture] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { login, register, resetPassword, error: authError } = useAuth();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password, circleCode);
      } else if (mode === 'register') {
        if (password.length < 6) {
          setLocalError('Password must be at least 6 characters long');
          return;
        }
        const avatarUrl = profilePicture || generateAvatarUrl(displayName);
        await register(email, password, displayName, circleCode, avatarUrl);
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setSuccessMessage('Password reset email sent! Check your inbox.');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentError = localError || authError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-3xl mb-6 shadow-lg">
              <User size={36} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'register' && 'Join Circle Drive'}
              {mode === 'forgot' && 'Reset Password'}
            </h1>
            <p className="text-slate-400 text-lg">
              {mode === 'login' && 'Sign in to your account'}
              {mode === 'register' && 'Create your safe driving profile'}
              {mode === 'forgot' && 'Enter your email to reset password'}
            </p>
          </div>

          {/* Firebase Setup Notice */}
          {currentError?.includes('operation-not-allowed') && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-amber-500 mt-0.5" />
                <div>
                  <h3 className="text-amber-500 font-semibold text-sm mb-2">Firebase Setup Required</h3>
                  <p className="text-amber-200 text-xs leading-relaxed">
                    To enable authentication, please:{'\n'}
                    1. Go to Firebase Console → Authentication → Sign-in method{'\n'}
                    2. Enable "Email/Password" provider{'\n'}
                    3. Save the changes
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'register' && (
              <>
                {/* Profile Picture Upload */}
                <div className="text-center">
                  <label className="block text-sm font-semibold text-slate-200 mb-3">
                    Profile Picture
                  </label>
                  <div className="relative inline-block">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-r from-purple-500 to-blue-500 border-4 border-slate-600 shadow-lg">
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
                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-purple-500 hover:bg-purple-600 rounded-full flex items-center justify-center cursor-pointer shadow-lg transition-colors">
                      <Upload size={16} className="text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Upload a photo or we'll generate one for you</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-3">
                    Display Name
                  </label>
                  <div className="relative">
                    <User size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full pl-12 pr-4 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-lg"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-3">
                Email Address
              </label>
              <div className="relative">
                <Mail size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-12 pr-4 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-lg"
                  required
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-3">
                  Password
                </label>
                <div className="relative">
                  <Lock size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-12 pr-14 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-lg"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {mode === 'register' && (
                  <p className="text-xs text-slate-400 mt-2">Password must be at least 6 characters</p>
                )}
              </div>
            )}

            {/* Circle Code Input */}
            {mode !== 'forgot' && (
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-3">
                  Circle Code (Optional)
                </label>
                <div className="relative">
                  <Users size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={circleCode}
                    onChange={(e) => setCircleCode(e.target.value.toUpperCase())}
                    placeholder="Enter circle code to join"
                    className="w-full pl-12 pr-4 py-4 bg-slate-700/50 border border-slate-600 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-lg"
                    maxLength={6}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {mode === 'login' 
                    ? 'Join a friend\'s circle after signing in' 
                    : 'Join an existing circle or create your own'
                  }
                </p>
              </div>
            )}

            {currentError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                <p className="text-red-400 text-sm">{currentError}</p>
              </div>
            )}

            {successMessage && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
                <p className="text-green-400 text-sm">{successMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 disabled:cursor-not-allowed text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'register' && 'Create Account'}
                  {mode === 'forgot' && 'Send Reset Email'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center space-y-3">
            {mode === 'login' && (
              <>
                <button
                  onClick={() => setMode('forgot')}
                  className="text-purple-400 hover:text-purple-300 text-sm transition-colors font-medium"
                >
                  Forgot your password?
                </button>
                <p className="text-slate-400 text-sm">
                  Don't have an account?{' '}
                  <button
                    onClick={() => setMode('register')}
                    className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
                  >
                    Sign up
                  </button>
                </p>
              </>
            )}

            {mode === 'register' && (
              <p className="text-slate-400 text-sm">
                Already have an account?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
                >
                  Sign in
                </button>
              </p>
            )}

            {mode === 'forgot' && (
              <button
                onClick={() => setMode('login')}
                className="text-purple-400 hover:text-purple-300 text-sm transition-colors font-medium"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;