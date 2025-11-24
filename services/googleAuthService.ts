// import * as Google from 'expo-auth-session/providers/google';
// import * as WebBrowser from 'expo-web-browser';
// import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
// import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
// import { auth, db } from '../firebase/firebaseint';
// import { User } from '../types';

// WebBrowser.maybeCompleteAuthSession();

// const USERS_COLLECTION = 'users';

// export const useGoogleAuth = () => {
//   // For Expo Go, use the custom scheme which Google accepts
//   const [request, response, promptAsync] = Google.useAuthRequest({
//     androidClientId: '925356962696-jl1pbm36bmueq9s9q8h8bik4cb3ea620.apps.googleusercontent.com',
//     iosClientId: '925356962696-6qcm7ehokcm3o3vvdggik0ss0o3s554h.apps.googleusercontent.com',
//     webClientId: '925356962696-gbc42orlfevlj73ep3n1u72ju0pjd6jd.apps.googleusercontent.com',
//   });
// //web = 925356962696-gbc42orlfevlj73ep3n1u72ju0pjd6jd.apps.googleusercontent.com
//   const signInWithGoogle = async (): Promise<User> => {
//     try {
//       console.log('Starting Google Sign In...');
//       console.log('Request config:', request);
      
//       const result = await promptAsync();
      
//       console.log('Google Auth Result:', result);

//       if (result.type === 'success') {
//         console.log('Success! Got auth params:', result.params);
//         const { id_token } = result.params;
        
//         if (!id_token) {
//           throw new Error('No ID token received from Google');
//         }
        
//         const credential = GoogleAuthProvider.credential(id_token);
//         const userCredential = await signInWithCredential(auth, credential);
//         const firebaseUser = userCredential.user;

//         const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
//         const userDoc = await getDoc(userDocRef);

//         let user: User;

//         if (userDoc.exists()) {
//           const userData = userDoc.data();
//           user = {
//             id: firebaseUser.uid,
//             email: userData.email,
//             name: userData.name,
//             studentId: userData.studentId,
//             university: userData.university,
//             department: userData.department,
//             year: userData.year,
//             createdAt: userData.createdAt.toDate(),
//             updatedAt: userData.updatedAt.toDate(),
//           };
//         } else {
//           user = {
//             id: firebaseUser.uid,
//             email: firebaseUser.email || '',
//             name: firebaseUser.displayName || 'User',
//             createdAt: new Date(),
//             updatedAt: new Date(),
//           };

//           await setDoc(userDocRef, {
//             email: user.email,
//             name: user.name,
//             studentId: null,
//             university: null,
//             department: null,
//             year: null,
//             createdAt: Timestamp.now(),
//             updatedAt: Timestamp.now(),
//           });
//         }

//         return user;
//       } else if (result.type === 'dismiss' || result.type === 'cancel') {
//         // User closed the browser or cancelled - this is normal, not an error
//         console.log('User dismissed or cancelled Google sign in');
//         return null as any; // Return null to indicate user cancellation
//       } else if (result.type === 'error') {
//         console.log('Error during sign in:', result.error);
//         throw new Error(result.error?.message || 'Failed to sign in with Google');
//       } else {
//         console.log('Unknown result type:', result.type);
//         throw new Error('Google sign in failed. Please try again.');
//       }
//     } catch (error: any) {
//       // Only log actual errors, not user cancellations
//       if (error?.message && !error.message.includes('cancelled')) {
//         console.error('Google sign in error:', error);
//       }
//       throw error;
//     }
//   };

//   return { signInWithGoogle, request };
// };


import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseint';
import { User } from '../types';

WebBrowser.maybeCompleteAuthSession();

const USERS_COLLECTION = 'users';

export const useGoogleAuth = () => {
  // ✅ MUST USE useIdTokenAuthRequest FOR FIREBASE
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '420068660090-318vi3v8sjcb4dcn2nro7iqb7t7gohou.apps.googleusercontent.com', // web client (required)
    androidClientId: '925356962696-jl1pbm36bmueq9s9q8h8bik4cb3ea620.apps.googleusercontent.com',
    iosClientId: '925356962696-6qcm7ehokcm3o3vvdggik0ss0o3s554h.apps.googleusercontent.com',

    // Required for Expo Go
  });

  const signInWithGoogle = async (): Promise<User> => {
    try {
      console.log('Starting Google Sign In...');
      console.log('Request config:', request);

      const result = await promptAsync();

      console.log('Google Auth Result:', result);

      if (result.type === 'success') {
        const { id_token } = result.params;

        if (!id_token) {
          throw new Error('No ID token received from Google');
        }

        // Firebase login
        const credential = GoogleAuthProvider.credential(id_token);
        const userCredential = await signInWithCredential(auth, credential);
        const firebaseUser = userCredential.user;

        const userDocRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        let user: User;

        if (userDoc.exists()) {
          const userData = userDoc.data();
          user = {
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
        } else {
          user = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

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
        }

        return user;
      }

      if (result.type === 'dismiss' || result.type === 'cancel') {
        console.log('User cancelled Google sign-in');
        return null as any;
      }

      if (result.type === 'error') {
        console.error('Google sign-in error:', result.error);
        throw new Error(result.error?.message || 'Google sign-in failed');
      }

      throw new Error('Unknown Google sign-in result');
    } catch (error: any) {
      if (!error.message?.includes('cancelled')) {
        console.error('Google sign in error:', error);
      }
      throw error;
    }
  };

  return { signInWithGoogle, request };
};
