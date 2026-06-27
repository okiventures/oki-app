import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

type UserRole = 'client' | 'handyman' | 'admin';

/**
 * Guards a route — redirects to login if not authenticated,
 * or redirects to the correct home if the user's role doesn't match.
 */
export function useProtectedRoute(allowedRole: UserRole) {
    const { session, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        // Not logged in — allow viewing the UI for testing
        if (!session) return;

        // Wrong role → redirect to correct home
        const userType = session.user.userType;
        if (userType !== allowedRole) {
            if (userType === 'admin') {
                router.replace('/(admin)/');
            } else if (userType === 'handyman') {
                router.replace('/(handyman)/');
            } else {
                router.replace('/(client)/');
            }
        }
    }, [session, isLoading, allowedRole, router]);
}
