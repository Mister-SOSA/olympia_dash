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

    getUser(): User | null {
        return this.user;
    }

    isAuthenticated(): boolean {
        return this.accessToken !== null && this.user !== null;
    }

    isAdmin(): boolean {
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

    async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${this.accessToken}`,
        };

        let response = await fetch(url, { ...options, headers });

        // If token expired, try to refresh
        if (response.status === 401) {
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
                headers['Authorization'] = `Bearer ${this.accessToken}`;
                response = await fetch(url, { ...options, headers });
            } else {
                // Refresh failed, clear tokens and redirect to login
                this.clearTokens();
                if (typeof window !== 'undefined') {
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
}

export const authService = new AuthService();
