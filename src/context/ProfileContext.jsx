import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../firebase';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "firebase/auth";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";

const ProfileContext = createContext();

export const useProfile = () => useContext(ProfileContext);

export const ProfileProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Firebase Auth Data
    const [customProfile, setCustomProfile] = useState(null); // Firestore Custom Data
    const [authLoading, setAuthLoading] = useState(true);

    // 1. Listen for Auth State Changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser({
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName,
                    photoURL: currentUser.photoURL
                });
            } else {
                setUser(null);
                setCustomProfile(null);
            }
            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // 2. Listen for Firestore Custom Profile Changes
    useEffect(() => {
        if (!user) return;

        const profileRef = doc(db, `users/${user.uid}/profile`, 'details');
        
        const unsubscribe = onSnapshot(profileRef, (docSnap) => {
            if (docSnap.exists()) {
                setCustomProfile(docSnap.data());
            } else {
                setCustomProfile(null);
            }
        });

        return () => unsubscribe();
    }, [user]);

    // 3. Derived Profile Object (Priority: Custom > Google > Default)
    const profile = React.useMemo(() => {
        if (!user) return null;

        return {
            uid: user.uid,
            email: user.email,
            name: customProfile?.name || user.displayName || 'TickTasker User',
            avatar: customProfile?.avatar || user.photoURL || null,
            role: customProfile?.role || 'Productivity User',
        };
    }, [user, customProfile]);

    // 4. Update Profile Function
    const updateProfileData = async (updates) => {
        if (!user) return;
        const profileRef = doc(db, `users/${user.uid}/profile`, 'details');
        
        // Merge with existing data
        await setDoc(profileRef, {
            ...customProfile,
            ...updates,
            updatedAt: serverTimestamp(),
            provider: 'google' // Tracking auth source
        }, { merge: true });
    };

    // Auth Methods
    const loginWithEmail = async (email, password) => {
        return await signInWithEmailAndPassword(auth, email, password);
    };

    const signupWithEmail = async (email, password) => {
        return await createUserWithEmailAndPassword(auth, email, password);
    };

    const loginWithGoogle = async () => {
        return await signInWithPopup(auth, googleProvider);
    };

    const logout = async () => {
        return await signOut(auth);
    };

    const value = {
        user,
        profile,
        authLoading,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        logout,
        updateProfileData
    };

    return (
        <ProfileContext.Provider value={value}>
            {!authLoading && children}
        </ProfileContext.Provider>
    );
};
