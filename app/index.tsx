import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/config';
import { signIn, signUp } from '../services/authService';
import { useGoogleAuth } from '../services/googleAuthService';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithGoogle } = useGoogleAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignIn = async () => {
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const user = await signIn(email, password);

      Alert.alert(
        'Welcome Back!',
        `Welcome back, ${user.name}!`,
        [
          {
            text: 'OK',
            onPress: () => router.push('/home'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Login error:', error);

      if (error?.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else if (error?.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (error?.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (error?.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError(error?.message || 'Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const user = await signUp(email, password, name);

      Alert.alert(
        'Account Created!',
        `Welcome to UniMate, ${user.name}! Let's get started.`,
        [
          {
            text: 'OK',
            onPress: () => router.push('/home'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Sign up error:', error);

      if (error?.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists');
      } else if (error?.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else if (error?.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else {
        setError(error?.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };
  //google sign in handler
  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      const user = await signInWithGoogle();

      // If user is null, they dismissed/cancelled - this is normal, don't show error
      if (!user) {
        console.log('User cancelled Google sign in - no action needed');
        return;
      }

      Alert.alert(
        'Welcome!',
        `Welcome ${isSignUpMode ? 'to UniMate' : 'back'}, ${user.name}!`,
        [{ text: 'OK', onPress: () => router.push('/home') }]
      );
    } catch (error: any) {
      console.error('Google sign in error:', error);

      // Only show error messages for actual errors, not user cancellations
      if (error?.message?.includes('cancelled')) {
        // User cancelled - don't show error message
        return;
      } else if (error?.code === 'auth/popup-blocked') {
        setError('Popup was blocked. Please allow popups and try again.');
      } else if (error?.code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.');
      } else if (error?.code === 'auth/configuration-not-found') {
        setError('Google Sign-In is not properly configured. Please contact support.');
      } else {
        setError('Failed to sign in with Google. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Modern Gradient Background */}
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb', '#ffecd2']}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Geometric Pattern Overlay */}
      <View style={styles.patternOverlay}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.circle3} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <StatusBar style="light" />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Logo Section - Enhanced */}
            <View style={styles.logoContainer}>
              <View style={styles.logoBadge}>
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.logoGradient}
                >
                  <Text style={styles.logoText} accessible={true} accessibilityLabel="UniMate logo">
                    🎓
                  </Text>
                </LinearGradient>
              </View>
              <Text style={styles.appName}>UniMate</Text>
              <Text style={styles.tagline}>Your AI-Powered Study Companion</Text>
            </View>

            {/* Form Card - Enhanced */}
            <View style={styles.formCard}>
              <Text style={styles.title}>
                {isSignUpMode ? 'Create Account' : 'Welcome Back'}
              </Text>
              <Text style={styles.subtitle}>
                {isSignUpMode
                  ? 'Join thousands of students studying smarter'
                  : 'Sign in to continue your learning journey'}
              </Text>

              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={20} color={COLORS.error} style={{ marginRight: 8 }} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.form}>
                {isSignUpMode && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Full Name *</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your full name"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        editable={!loading}
                        placeholderTextColor="#999"
                        accessible={true}
                        accessibilityLabel="Full name input"
                        accessibilityHint="Enter your full name for account creation"
                      />
                    </View>
                  </View>
                )}

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email *</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="your.email@example.com"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      editable={!loading}
                      placeholderTextColor="#999"
                      accessible={true}
                      accessibilityLabel="Email input"
                      accessibilityHint="Enter your email address"
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password *</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={isSignUpMode ? "Min. 6 characters" : "Enter your password"}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      editable={!loading}
                      placeholderTextColor="#999"
                      accessible={true}
                      accessibilityLabel="Password input"
                      accessibilityHint={isSignUpMode ? "Enter a password with at least 6 characters" : "Enter your password"}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                      accessible={true}
                      accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                      accessibilityRole="button"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={showPassword ? "eye-outline" : "eye-off-outline"}
                        size={20}
                        color={COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {isSignUpMode && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Confirm Password *</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        editable={!loading}
                        placeholderTextColor="#999"
                        accessible={true}
                        accessibilityLabel="Confirm password input"
                        accessibilityHint="Re-enter your password to confirm"
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={styles.eyeIcon}
                        accessible={true}
                        accessibilityLabel={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        accessibilityRole="button"
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                          size={20}
                          color={COLORS.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {!isSignUpMode && (
                  <TouchableOpacity
                    style={styles.forgotPassword}
                    onPress={handleForgotPassword}
                    disabled={loading}
                    accessible={true}
                    accessibilityLabel="Forgot password"
                    accessibilityRole="button"
                    accessibilityHint="Navigates to password reset screen"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={isSignUpMode ? handleSignUp : handleSignIn}
                  disabled={loading}
                  accessible={true}
                  accessibilityLabel={isSignUpMode ? 'Create account button' : 'Sign in button'}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: loading }}
                >
                  <LinearGradient
                    colors={loading ? ['#999', '#999'] : ['#667eea', '#764ba2']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>
                        {isSignUpMode ? 'Create Account' : 'Sign In'}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.divider} />
                </View>

                {/* Google Sign In Button - Enhanced */}
                <TouchableOpacity
                  style={[styles.googleButton, (loading || googleLoading) && styles.buttonDisabled]}
                  onPress={handleGoogleSignIn}
                  disabled={loading || googleLoading}
                  activeOpacity={0.7}
                  accessible={true}
                  accessibilityLabel={isSignUpMode ? 'Sign up with Google' : 'Continue with Google'}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: loading || googleLoading }}
                >
                  {googleLoading ? (
                    <ActivityIndicator color="#5f6368" size="small" />
                  ) : (
                    <>
                      <View style={styles.googleLogoContainer}>
                        <Image
                          source={require('../assets/images/googleLogo.png')}
                          style={styles.googleLogo}
                          contentFit="contain"
                        />
                      </View>
                      <Text style={styles.googleButtonText}>
                        {isSignUpMode ? 'Sign up with Google' : 'Continue with Google'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.toggleContainer}>
                  <Text style={styles.toggleText}>
                    {isSignUpMode ? 'Already have an account? ' : "Don't have an account? "}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setIsSignUpMode(!isSignUpMode);
                      setError('');
                      setName('');
                      setConfirmPassword('');
                      setShowPassword(false);
                      setShowConfirmPassword(false);
                    }}
                    disabled={loading}
                    accessible={true}
                    accessibilityLabel={isSignUpMode ? 'Switch to sign in' : 'Switch to sign up'}
                    accessibilityRole="button"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.toggleLink}>
                      {isSignUpMode ? 'Sign In' : 'Sign Up'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Professional Value Proposition */}
            <View style={styles.valueProposition}>
              <Text style={styles.valuePropTitle}>Trusted by students worldwide</Text>
              
              <View style={styles.benefitsList}>
                <View style={styles.benefitRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
                  <Text style={styles.benefitText}>AI-powered study assistance</Text>
                </View>
                <View style={styles.benefitRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
                  <Text style={styles.benefitText}>Smart progress tracking</Text>
                </View>
                <View style={styles.benefitRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
                  <Text style={styles.benefitText}>Personalized learning paths</Text>
                </View>
              </View>
            </View>

            {/* Trust Badge */}
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#4caf50" />
              <Text style={styles.trustText}>Your data is encrypted & secure</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  patternOverlay: {
    position: 'absolute',
    width: width,
    height: height,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -100,
    right: -50,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: 100,
    left: -50,
  },
  circle3: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    bottom: 300,
    right: 50,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 20 : 12,
    paddingBottom: 32,
  },
  heroContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  glassmorphicCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  heroImage: {
    width: width * 0.6,
    height: 180,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  logoBadge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 42,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 1)',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  form: {
    marginBottom: 8,
  },
  inputContainer: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 8,
    marginLeft: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 24,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0.1,
  },
  buttonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
    letterSpacing: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  toggleLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  valueProposition: {
    marginTop: 24,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  valuePropTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  benefitsList: {
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
    letterSpacing: 0.2,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'center',
  },
  trustText: {
    fontSize: 12,
    color: '#555',
    marginLeft: 6,
    fontWeight: '600',
  },



  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 48,
  },
  googleLogoContainer: {
    width: 20,
    height: 20,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleLogo: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3c4043',
    letterSpacing: 0.25,
  },
});
