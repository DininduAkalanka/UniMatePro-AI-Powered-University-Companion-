import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    createUserWithEmailAndPassword,
    User as FirebaseUser,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseint';
import { User } from '../types';

const USERS_COLLECTION = 'users';
const AUTH_USER_KEY = '@unimate_auth_user';

/**
 * Save user to AsyncStorage for persistence
 */
const saveUserToStorage = async (user: User): Promise<void> => {
  try {
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user to storage:', error);
  }
};

/**
 * Get user from AsyncStorage
 */
const getUserFromStorage = async (): Promise<User | null> => {
  try {
    const userData = await AsyncStorage.getItem(AUTH_USER_KEY);
    if (userData) {
      const user = JSON.parse(userData);
      // Convert date strings back to Date objects
      user.createdAt = new Date(user.createdAt);
      user.updatedAt = new Date(user.updatedAt);
      return user;
    }
  } catch (error) {
    console.error('Error getting user from storage:', error);
  }
  return null;
};

/**
 * Remove user from AsyncStorage
 */
const removeUserFromStorage = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(AUTH_USER_KEY);
  } catch (error) {
    console.error('Error removing user from storage:', error);
  }
};

/**
 * Sign up a new user
 */
export const signUp = async (
  email: string,
  password: string,
  name: string
): Promise<User> => {
  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Update profile with display name
    await updateProfile(userCredential.user, { displayName: name });

    // Create user document in Firestore
    const user: User = {
      id: userCredential.user.uid,
      email,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(doc(db, USERS_COLLECTION, user.id), {
      email: user.email,
      name: user.name,
      studentId: null,
      university: null,
      department: null,
      year: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Save to AsyncStorage for persistence
    await saveUserToStorage(user);

    return user;
  } catch (error: any) {
    console.error('Sign up error:', error);
    
    // Handle specific Firebase Auth errors
    if (error?.code === 'auth/configuration-not-found') {
      throw new Error(
        'Firebase Authentication is not configured.\n\n' +
        'Please enable Email/Password authentication:\n' +
        '1. Go to Firebase Console\n' +
        '2. Select project: unimate-5d2cd\n' +
        '3. Click Authentication → Sign-in method\n' +
        '4. Enable Email/Password provider'
      );
    }
    
    // Handle Firestore permission errors
    if (error?.code === 'permission-denied' || 
        error?.message?.includes('Missing or insufficient permissions')) {
      throw new Error(
        'Firestore permissions not configured.\n\n' +
        'Please update Firestore rules:\n' +
        '1. Go to Firebase Console\n' +
        '2. Firestore Database → Rules\n' +
        '3. Use the rules from FIREBASE_AUTH_SETUP.md\n' +
        '4. Click Publish'
      );
    }
    
    throw new Error(error.message || 'Failed to sign up');
  }
};

/**
 * Sign in existing user
 */
export const signIn = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Get user data from Firestore
    const userDocRef = doc(db, USERS_COLLECTION, userCredential.user.uid);
    let userDoc;
    
    try {
      userDoc = await getDoc(userDocRef);
    } catch (firestoreError: any) {
      console.error('Firestore read error:', firestoreError);
      throw new Error('Unable to access user data. Please check your connection.');
    }

    let user: User;

    if (!userDoc.exists()) {
      // User document doesn't exist in Firestore (might happen after password reset)
      // Create a new document with available Firebase Auth data
      console.log('User document not found, creating new one...');
      
      user = {
        id: userCredential.user.uid,
        email: userCredential.user.email || email,
        name: userCredential.user.displayName || email.split('@')[0],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      try {
        // Create the user document in Firestore
        await setDoc(userDocRef, {
          email: user.email,
          name: user.name,
          studentId: null,
          university: null,
          department: null,
          year: null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        console.log('User document created successfully');
      } catch (createError: any) {
        console.error('Failed to create user document:', createError);
        
        if (createError?.code === 'permission-denied') {
          throw new Error(
            'Unable to create user profile. Please ensure you are logged in and Firestore rules allow authenticated access.'
          );
        }
        
        if (createError?.code === 'unavailable') {
          throw new Error('Firestore is temporarily unavailable. Please check your internet connection.');
        }
        
        throw new Error('Failed to create user profile. Please try again or contact support.');
      }
    } else {
      // User document exists, retrieve data
      const userData = userDoc.data();
      user = {
        id: userCredential.user.uid,
        email: userData.email,
        name: userData.name,
        studentId: userData.studentId,
        university: userData.university,
        department: userData.department,
        year: userData.year,
        createdAt: userData.createdAt.toDate(),
        updatedAt: userData.updatedAt.toDate(),
      };
    }

    // Save to AsyncStorage for persistence
    await saveUserToStorage(user);

    return user;
  } catch (error: any) {
    console.error('Sign in error:', error);
    
    // Handle specific Firebase Auth errors
    if (error?.code === 'auth/configuration-not-found') {
      throw new Error(
        'Firebase Authentication is not configured.\n\n' +
        'Please enable Email/Password authentication:\n' +
        '1. Go to Firebase Console\n' +
        '2. Select project: unimate-5d2cd\n' +
        '3. Click Authentication → Sign-in method\n' +
        '4. Enable Email/Password provider'
      );
    }
    
    throw new Error(error.message || 'Failed to sign in');
  }
};

/**
 * Clear study session data for current user
 */
const clearStudySessionData = async (): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (user) {
      const studySessionKey = `@study_session_state_${user.uid}`;
      await AsyncStorage.removeItem(studySessionKey);
      console.log('[Auth] Study session cleared for user:', user.uid);
    }
  } catch (error) {
    console.error('[Auth] Error clearing study session:', error);
  }
};

/**
 * Sign out current user
 */
export const signOutUser = async (): Promise<void> => {
  try {
    // Clear study session before signing out
    await clearStudySessionData();
    
    await signOut(auth);
    // Remove user from AsyncStorage
    await removeUserFromStorage();
    
    console.log('[Auth] User signed out successfully');
  } catch (error: any) {
    console.error('Sign out error:', error);
    throw new Error(error.message || 'Failed to sign out');
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const firebaseUser = auth.currentUser;
  
  console.log('[AuthService] getCurrentUser - firebaseUser:', firebaseUser?.uid);
  console.log('[AuthService] getCurrentUser - email verified:', firebaseUser?.emailVerified);
  console.log('[AuthService] getCurrentUser - auth state:', !!firebaseUser);

  if (!firebaseUser) {
    console.log('[AuthService] No Firebase user, checking AsyncStorage...');
    // Try to get from AsyncStorage if Firebase auth hasn't loaded yet
    return await getUserFromStorage();
  }

  console.log('[AuthService] Fetching user document from Firestore...');
  const userDoc = await getDoc(doc(db, USERS_COLLECTION, firebaseUser.uid));

  if (!userDoc.exists()) {
    return null;
  }

  const userData = userDoc.data();
  const user: User = {
    id: firebaseUser.uid,
    email: userData.email,
    name: userData.name,
    studentId: userData.studentId,
    university: userData.university,
    department: userData.department,
    year: userData.year,
    createdAt: userData.createdAt.toDate(),
    updatedAt: userData.updatedAt.toDate(),
  };

  // Update AsyncStorage
  await saveUserToStorage(user);

  return user;
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (
  callback: (user: FirebaseUser | null) => void
) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Password reset error:', error);
    throw new Error(error.message || 'Failed to send password reset email');
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<User>
): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.email;
    delete updateData.createdAt;

    await setDoc(userRef, updateData, { merge: true });

    // Update Firebase Auth display name if name changed
    if (updates.name && auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: updates.name });
    }
  } catch (error: any) {
    console.error('Update profile error:', error);
    throw new Error(error.message || 'Failed to update profile');
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));

    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    return {
      id: userId,
      email: userData.email,
      name: userData.name,
      studentId: userData.studentId,
      university: userData.university,
      department: userData.department,
      year: userData.year,
      createdAt: userData.createdAt.toDate(),
      updatedAt: userData.updatedAt.toDate(),
    };
  } catch (error: any) {
    console.error('Get user error:', error);
    return null;
  }
};

export default {
  signUp,
  signIn,
  signOutUser,
  getCurrentUser,
  onAuthStateChange,
  resetPassword,
  updateUserProfile,
  getUserById,
};
