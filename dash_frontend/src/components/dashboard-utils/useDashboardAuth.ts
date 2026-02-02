"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authService, User } from "@/lib/auth";

interface UseDashboardAuthReturn {
  /** Whether authentication check is in progress */
  checkingAuth: boolean;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Current user (impersonated user if impersonating) */
  user: User | null;
  /** Whether admin is impersonating another user */
  isImpersonating: boolean;
  /** Update user state (used when impersonation changes) */
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  /** Update impersonation state */
  setIsImpersonating: React.Dispatch<React.SetStateAction<boolean>>;
  /** Handle user logout */
  handleLogout: () => Promise<void>;
  /** End impersonation and return to admin view */
  handleEndImpersonation: () => Promise<void>;
}

/**
 * Hook to manage dashboard authentication state
 * 
 * Handles:
 * - Initial auth check on mount
 * - Token validation
 * - Impersonation state
 * - Logout/end impersonation actions
 */
export function useDashboardAuth(): UseDashboardAuthReturn {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<User | null>(authService.getUser());
  const [isImpersonating, setIsImpersonating] = useState(authService.isImpersonating());

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // If we lack access token but have a refresh token, attempt a silent refresh first
        if (!authService.isAuthenticated() && authService.hasRefreshToken()) {
          await authService.refreshAccessToken();
        }

        if (!authService.isAuthenticated()) {
          router.push('/login');
          return;
        }

        // Verify token is still valid
        const currentUser = await authService.getCurrentUser();
        if (!currentUser) {
          await authService.logout();
          router.push('/login');
          return;
        }

        // Set user and impersonation state
        setUser(authService.getUser()); // Gets impersonated user if active
        setIsImpersonating(authService.isImpersonating());
        setIsAuthenticated(true);
      } catch (error) {
        console.error('[Auth] checkAuth failed', error);
        await authService.logout();
        router.push('/login');
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = useCallback(async () => {
    await authService.logout();
    router.push('/login');
  }, [router]);

  const handleEndImpersonation = useCallback(async () => {
    await authService.endImpersonation();
    setIsImpersonating(false);
    setUser(authService.getRealUser());
    // Reload dashboard with admin's preferences
    window.location.reload();
  }, []);

  return {
    checkingAuth,
    isAuthenticated,
    user,
    isImpersonating,
    setUser,
    setIsImpersonating,
    handleLogout,
    handleEndImpersonation,
  };
}

export default useDashboardAuth;
