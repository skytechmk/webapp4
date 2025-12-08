interface RetryOptions {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
}

interface ApiOptions extends RequestInit {
    retry?: RetryOptions;
}

class ApiClient {
    private ongoingRequests: Map<string, Promise<any>> = new Map();
    private baseUrl: string;

    constructor() {
        // Prefer explicit API URL, otherwise default to current origin
        // @ts-ignore
        const envUrl = (import.meta as any)?.env?.VITE_API_URL;
        if (envUrl) {
            try {
                const parsed = new URL(envUrl);
                const envOrigin = parsed.origin;
                // Prefer same-origin in browser to avoid CORS/cookie issues if env points elsewhere
                if (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== envOrigin) {
                    this.baseUrl = window.location.origin;
                } else {
                    this.baseUrl = envOrigin + parsed.pathname.replace(/\/$/, '');
                }
            } catch {
                this.baseUrl = envUrl.replace(/\/$/, '');
            }
        } else if (typeof window !== 'undefined' && window.location?.origin) {
            this.baseUrl = window.location.origin;
        } else {
            this.baseUrl = '';
        }
    }

    private getAuthHeaders(): Record<string, string> {
        if (typeof window === 'undefined') return {};
        try {
            const token = localStorage.getItem('snapify_token');
            return token ? { Authorization: `Bearer ${token}` } : {};
        } catch {
            return {};
        }
    }

    private generateRequestKey(url: string, options: ApiOptions): string {
        // Create a unique key based on URL and relevant options
        const keyData = {
            url,
            method: options.method || 'GET',
            body: options.body,
            headers: options.headers
        };
        return JSON.stringify(keyData);
    }

    private isRetryableError(status: number): boolean {
        return status >= 500 || status === 429;
    }

    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async makeRequestWithRetry(url: string, options: ApiOptions): Promise<Response> {
        const { retry = {}, ...fetchOptions } = options;
        const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000 } = retry;

        let lastError: Error;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url, fetchOptions);

                if (!this.isRetryableError(response.status)) {
                    return response;
                }

                if (attempt < maxRetries) {
                    // Exponential backoff: 1s, 2s, 4s
                    const delayMs = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
                    await this.delay(delayMs);
                } else {
                    // Last attempt failed with retryable error
                    return response;
                }
            } catch (error) {
                lastError = error as Error;
                if (attempt < maxRetries) {
                    const delayMs = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
                    await this.delay(delayMs);
                }
            }
        }

        throw lastError!;
    }

    async makeRequest(url: string, options: ApiOptions = {}): Promise<any> {
        const requestKey = this.generateRequestKey(url, options);

        // Check for ongoing request
        if (this.ongoingRequests.has(requestKey)) {
            return this.ongoingRequests.get(requestKey);
        }

        // Create new request promise
        const requestPromise = this.makeRequestWithRetry(url, options)
            .then(async (response) => {
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
                return response.json();
            })
            .finally(() => {
                // Clean up the ongoing request
                this.ongoingRequests.delete(requestKey);
            });

        // Store the ongoing request
        this.ongoingRequests.set(requestKey, requestPromise);

        return requestPromise;
    }

    // Convenience methods
    async get(url: string, options: ApiOptions = {}): Promise<any> {
        return this.makeRequest(url, {
            ...options,
            method: 'GET',
            headers: {
                ...this.getAuthHeaders(),
                ...options.headers
            }
        });
    }

    async post(url: string, data: any, options: ApiOptions = {}): Promise<any> {
        return this.makeRequest(url, {
            ...options,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeaders(),
                ...options.headers
            },
            body: JSON.stringify(data)
        });
    }

    async put(url: string, data: any, options: ApiOptions = {}): Promise<any> {
        return this.makeRequest(url, {
            ...options,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeaders(),
                ...options.headers
            },
            body: JSON.stringify(data)
        });
    }

    async delete(url: string, options: ApiOptions = {}): Promise<any> {
        return this.makeRequest(url, {
            ...options,
            method: 'DELETE',
            headers: {
                ...this.getAuthHeaders(),
                ...options.headers
            }
        });
    }

    // --- Domain-specific helpers ---
    async login(email: string, password: string) {
        const url = `${this.baseUrl}/api/auth/login`;
        return this.post(url, { email, password }, { headers: {} });
    }

    async register(user: any) {
        const url = `${this.baseUrl}/api/auth/register`;
        return this.post(url, user, { headers: {} });
    }

    async googleLogin(credential: string) {
        const url = `${this.baseUrl}/api/auth/google`;
        return this.post(url, { credential }, { headers: {} });
    }

    async fetchEvents() {
        const url = `${this.baseUrl}/api/events`;
        return this.get(url);
    }

    async fetchEventById(id: string) {
        const url = `${this.baseUrl}/api/events/${id}`;
        return this.get(url, { headers: {} });
    }

    async createEvent(event: any) {
        const url = `${this.baseUrl}/api/events`;
        return this.post(url, event);
    }

    async updateEvent(event: any) {
        const url = `${this.baseUrl}/api/events/${event.id}`;
        return this.put(url, event);
    }

    async deleteEvent(id: string) {
        const url = `${this.baseUrl}/api/events/${id}`;
        return this.delete(url);
    }

    async incrementEventView(eventId: string) {
        const url = `${this.baseUrl}/api/events/${eventId}/view`;
        return this.post(url, {});
    }

    async fetchUsers() {
        const url = `${this.baseUrl}/api/users`;
        return this.get(url);
    }

    async fetchUser(id: string) {
        const url = `${this.baseUrl}/api/users/${id}`;
        return this.get(url);
    }

    async updateUser(user: any) {
        const url = `${this.baseUrl}/api/users/${user.id}`;
        return this.put(url, user);
    }

    async deleteUser(id: string) {
        const url = `${this.baseUrl}/api/users/${id}`;
        return this.delete(url);
    }

    async likeMedia(mediaId: string) {
        const url = `${this.baseUrl}/api/media/${mediaId}/like`;
        return this.put(url, {});
    }

    async deleteMedia(mediaId: string) {
        const url = `${this.baseUrl}/api/media/${mediaId}`;
        return this.delete(url);
    }

    async bulkDeleteMedia(mediaIds: string[]) {
        const url = `${this.baseUrl}/api/media/bulk-delete`;
        return this.post(url, { mediaIds });
    }

    async uploadMedia(file: File, metadata: any, eventId: string, onProgress?: (percent: number) => void) {
        const url = `${this.baseUrl}/api/media`;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('eventId', eventId);
        Object.entries(metadata || {}).forEach(([key, value]) => {
            formData.append(key, value as any);
        });

        const headers = this.getAuthHeaders();

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
            xhr.upload.onprogress = (e) => {
                if (onProgress && e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    onProgress(percent);
                }
            };
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch (err) {
                        reject(err);
                    }
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            };
            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.send(formData);
        });
    }

    async generateImageCaption(imageData: string) {
        const url = `${this.baseUrl}/api/ai/generate-caption`;
        return this.post(url, { imageData });
    }

    async generateEventDescription(title: string, theme?: string) {
        const url = `${this.baseUrl}/api/ai/generate-event-description`;
        return this.post(url, { title, theme });
    }
}

export const apiClient = new ApiClient();
export const api = apiClient;
export default apiClient;
