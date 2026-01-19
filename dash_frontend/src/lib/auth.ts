import { API_BASE_URL } from '../config';

export interface User {
    id: number;
    email: string;
    name: string;
    role: string;
    created_at?: string;
    last_login?: string;
}

export interface AuthResponse {
    success: boolean;
    access_token?: string;
    refresh_token?: string;
    user?: User;
    error?: string;
}

class AuthService {
    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    private user: User | null = null;
    private impersonatedUser: User | null = null;
    private adminUser: User | null = null;

    constructor() {
        // Load tokens from localStorage on initialization
        if (typeof window !== 'undefined') {
            this.accessToken = localStorage.getItem('access_token');
            this.refreshToken = localStorage.getItem('refresh_token');
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    this.user = JSON.parse(userStr);
                } catch (e) {
                    console.error('Failed to parse user from localStorage', e);
                }
            }

            // Load impersonation state
            const impersonatedStr = localStorage.getItem('impersonated_user');
            const adminStr = localStorage.getItem('admin_user');
            if (impersonatedStr && adminStr) {
                try {
                    this.impersonatedUser = JSON.parse(impersonatedStr);
                    this.adminUser = JSON.parse(adminStr);
                } catch (e) {
                    console.error('Failed to parse impersonation data', e);
                }
            }
        }
    }

    setTokens(accessToken: string, refreshToken: string, user: User) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.user = user;

        if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('refresh_token', refreshToken);
            localStorage.setItem('user', JSON.stringify(user));
        }
    }

    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        this.user = null;

        if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
        }
    }

    getAccessToken(): string | null {
        return this.accessToken;
    }

    getRefreshToken(): string | null {
        return this.refreshToken;
    }

    hasRefreshToken(): boolean {
        return this.refreshToken !== null;
    }

    getUser(): User | null {
        // Return impersonated user if active, otherwise real user
        return this.impersonatedUser || this.user;
    }

    getRealUser(): User | null {
        // Always return the actual logged-in user
        return this.user;
    }

    getAdminUser(): User | null {
        return this.adminUser;
    }

    getImpersonatedUser(): User | null {
        return this.impersonatedUser;
    }

    isImpersonating(): boolean {
        return this.impersonatedUser !== null && this.adminUser !== null;
    }

    isAuthenticated(): boolean {
        return this.accessToken !== null && this.user !== null;
    }

    isAdmin(): boolean {
        // Check real user role, not impersonated
        return this.user?.role === 'admin';
    }

    async refreshAccessToken(): Promise<boolean> {
        if (!this.refreshToken) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh_token: this.refreshToken }),
            });

            const data = await response.json();

            if (data.success && data.access_token) {
                this.accessToken = data.access_token;
                if (typeof window !== 'undefined') {
                    localStorage.setItem('access_token', data.access_token);
                }
                return true;
            }

            return false;
        } catch (error) {
            console.error('Failed to refresh token', error);
            return false;
        }
    }

    // Track if we've already redirected to avoid multiple redirects
    private redirectingToLogin: boolean = false;

    async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${this.accessToken}`,
        };

        let response: Response;
        try {
            response = await fetch(url, { ...options, headers });
        } catch (error) {
            // Don't log AbortError - these are expected when components unmount
            if (error instanceof DOMException && error.name === 'AbortError') {
                throw error;
            }
            // Network error - API is likely down, don't redirect
            console.error('[Auth] Network error fetching:', url, error);
            throw error;
        }

        // If token expired, try to refresh
        if (response.status === 401) {
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
                headers['Authorization'] = `Bearer ${this.accessToken}`;
                response = await fetch(url, { ...options, headers });
            } else {
                // Refresh failed, clear tokens and redirect to login (only once)
                this.clearTokens();
                if (typeof window !== 'undefined' && !this.redirectingToLogin) {
                    this.redirectingToLogin = true;
                    window.location.href = '/login';
                }
            }
        }

        return response;
    }

    async getLoginUrl(state?: string): Promise<string> {
        const params = state ? `?state=${encodeURIComponent(state)}` : '';
        const response = await fetch(`${API_BASE_URL}/api/auth/login${params}`);
        const data = await response.json();

        if (data.success && data.auth_url) {
            return data.auth_url;
        }

        throw new Error(data.error || 'Failed to get login URL');
    }

    async handleCallback(code: string): Promise<AuthResponse> {
        const response = await fetch(`${API_BASE_URL}/api/auth/callback?code=${code}`);
        const data = await response.json();

        if (data.success && data.access_token && data.refresh_token && data.user) {
            this.setTokens(data.access_token, data.refresh_token, data.user);
        }

        return data;
    }

    async logout(): Promise<void> {
        if (this.refreshToken) {
            try {
                await this.fetchWithAuth(`${API_BASE_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ refresh_token: this.refreshToken }),
                });
            } catch (error) {
                console.error('Logout request failed', error);
            }
        }

        this.clearTokens();
    }

    async getCurrentUser(): Promise<User | null> {
        if (!this.isAuthenticated()) return null;

        try {
            const response = await this.fetchWithAuth(`${API_BASE_URL}/api/auth/me`);
            const data = await response.json();

            if (data.success && data.user) {
                this.user = data.user;
                if (typeof window !== 'undefined') {
                    localStorage.setItem('user', JSON.stringify(data.user));
                }
                return data.user;
            }

            return null;
        } catch (error) {
            console.error('Failed to get current user', error);
            return null;
        }
    }

    async impersonateUser(userId: number): Promise<boolean> {
        if (!this.isAdmin()) {
            console.error('❌ Only admins can impersonate');
            return false;
        }

        console.log(`🎭 Starting impersonation of user ${userId}...`);
        console.log(`   Current user: ${this.user?.email} (ID: ${this.user?.id})`);

        try {
            const response = await this.fetchWithAuth(
                `${API_BASE_URL}/api/auth/admin/impersonate/${userId}`,
                { method: 'POST' }
            );

            const data = await response.json();

            if (data.success) {
                console.log(`✅ Impersonation approved by server`);
                console.log(`   Admin: ${data.admin_user.email} (ID: ${data.admin_user.id})`);
                console.log(`   Impersonating: ${data.impersonated_user.email} (ID: ${data.impersonated_user.id})`);

                // Store admin user and impersonated user
                this.adminUser = data.admin_user;
                this.impersonatedUser = data.impersonated_user;

                if (typeof window !== 'undefined') {
                    localStorage.setItem('admin_user', JSON.stringify(this.adminUser));
                    localStorage.setItem('impersonated_user', JSON.stringify(this.impersonatedUser));
                }

                // Switch preferences service to impersonated user
                console.log(`🔄 Switching preferences to user ${this.impersonatedUser.id}...`);
                const { preferencesService } = await import('./preferences');
                await preferencesService.switchUser();
                console.log(`✅ Preferences switched to ${this.impersonatedUser.email}`);

                return true;
            }

            console.error('❌ Impersonation failed:', data.error);
            return false;
        } catch (error) {
            console.error('❌ Impersonation request failed', error);
            return false;
        }
    }

    async endImpersonation(): Promise<boolean> {
        if (!this.isImpersonating()) {
            console.warn('⚠️ Not currently impersonating');
            return false;
        }

        console.log(`🎭 Ending impersonation...`);
        console.log(`   Was impersonating: ${this.impersonatedUser?.email} (ID: ${this.impersonatedUser?.id})`);
        console.log(`   Returning to: ${this.adminUser?.email} (ID: ${this.adminUser?.id})`);

        try {
            const impersonatedEmail = this.impersonatedUser?.email;

            const response = await this.fetchWithAuth(
                `${API_BASE_URL}/api/auth/admin/end-impersonation`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ impersonated_email: impersonatedEmail })
                }
            );

            const data = await response.json();

            if (data.success) {
                console.log('✅ Server confirmed impersonation end');

                // Clear impersonation state
                this.impersonatedUser = null;
                this.adminUser = null;

                if (typeof window !== 'undefined') {
                    localStorage.removeItem('admin_user');
                    localStorage.removeItem('impersonated_user');
                }

                // Switch back to admin's preferences
                console.log(`🔄 Switching preferences back to admin (user ${this.user?.id})...`);
                const { preferencesService } = await import('./preferences');
                await preferencesService.switchUser();
                console.log(`✅ Impersonation fully ended`);

                return true;
            }

            console.error('❌ Server failed to end impersonation:', data.error);
            return false;
        } catch (error) {
            console.error('❌ End impersonation request failed', error);
            return false;
        }
    }
}

export const authService = new AuthService();
