import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider } from '../firebase';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "firebase/auth";

const ProfileContext = createContext();

export const useProfile = () => useContext(ProfileContext);

export const ProfileProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Listen for Auth State Changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                // Map Firebase user to our app's user structure
                setUser({
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName,
                    photoURL: currentUser.photoURL
                });
            } else {
                setUser(null);
            }
            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, []);

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
        authLoading,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        logout
    };

    return (
        <ProfileContext.Provider value={value}>
            {!authLoading && children}
        </ProfileContext.Provider>
    );
};
