import { User, Event, MediaItem, GuestbookEntry, Comment, Vendor } from '../types';
import { trackApiError, trackError } from '../utils/monitoring';

// Enhanced API URL configuration with environment-aware defaults
const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;

  if (envUrl) {
    // Validate the URL format
    try {
      new URL(envUrl);
      return envUrl.replace(/\/$/, ''); // Remove trailing slash
    } catch (error) {
      console.warn('Invalid VITE_API_URL format, falling back to default:', envUrl);
    }
  }

  // Environment-aware defaults
  const isDev = import.meta.env.DEV;
  const defaultUrl = isDev ? 'http://localhost:3001' : '';

  if (!defaultUrl) {
    console.error('CRITICAL: No API URL configured. Set VITE_API_URL environment variable.');
    // Only throw in development if no URL is configured
    if (isDev) {
      throw new Error('API URL not configured. Contact administrator.');
    }
  }

  return defaultUrl;
};

const API_URL = getApiUrl();

// Helper function to construct proxy URLs for HTTPS access
const buildProxyUrl = (key: string): string => {
    if (!key) return '';
    // If it's already a proxy URL, return as-is
    if (key.startsWith('/api/proxy-media') || key.startsWith('http')) {
        return key;
    }
    // Otherwise, construct the proxy URL
    return `${API_URL}/api/proxy-media?key=${encodeURIComponent(key)}`;
};

const getAuthHeaders = () => {
    // Check both token storage locations for backward compatibility
    const token = localStorage.getItem('snapify_token') || localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const api = {
    // ... existing methods (User, Auth, etc.) ...
    fetchUsers: async (): Promise<User[]> => {
        return handleApiRequest(async () => {
            const res = await fetch(`${API_URL}/api/users?_t=${Date.now()}`, { headers: { ...getAuthHeaders() } });
            return res.json();
        });
    },

    login: async (email: string, password?: string): Promise<{ token: string, user: User }> => {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) throw new Error("Invalid credentials");
        return res.json();
    },

    googleLogin: async (credential: string): Promise<{ token: string, user: User }> => {
        const res = await fetch(`${API_URL}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential })
        });
        if (!res.ok) throw new Error("Google login failed");
        return res.json();
    },

    refreshToken: async (): Promise<{ token: string }> => {
        const res = await fetch(`${API_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { ...getAuthHeaders() }
        });
        if (!res.ok) throw new Error("Token refresh failed");
        return res.json();
    },

    createUser: async (user: User): Promise<{ token: string, user: User }> => {
        const res = await fetch(`${API_URL}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
        if (!res.ok) throw new Error("Registration failed");
        return res.json();
    },

    updateUser: async (user: User): Promise<void> => {
        return handleApiRequest(async () => {
            await fetch(`${API_URL}/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify(user)
            });
        });
    },
    upgradeUser: async (userId: string, tier: string): Promise<void> => {
        await fetch(`${API_URL}/api/users/${userId}/upgrade`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ tier })
        });
    },
    deleteUser: async (id: string): Promise<void> => {
        await fetch(`${API_URL}/api/users/${id}`, { method: 'DELETE', headers: { ...getAuthHeaders() } });
    },

    fetchUser: async (id: string): Promise<User> => {
        const res = await fetch(`${API_URL}/api/users/${id}`, { headers: { ...getAuthHeaders() } });
        if (!res.ok) throw new Error('Failed to fetch user');
        return res.json();
    },

    // --- EVENTS ---
    fetchEvents: async (): Promise<Event[]> => {
        const res = await fetch(`${API_URL}/api/events?_t=${Date.now()}`, { headers: { ...getAuthHeaders() } });
        if (!res.ok) return [];
        const data = await res.json();
        return data.map((e: any) => ({
            ...e,
            media: e.media.map((m: any) => ({
                ...m,
                url: buildProxyUrl(m.url),
                previewUrl: m.previewUrl ? buildProxyUrl(m.previewUrl) : buildProxyUrl(m.url),
                isWatermarked: !!m.isWatermarked
            }))
        }));
    },

    fetchEventById: async (eventId: string): Promise<Event> => {
        const res = await fetch(`${API_URL}/api/events/${eventId}?_t=${Date.now()}`);
        if (!res.ok) throw new Error(`Failed to fetch event`);
        const data = await res.json();
        return {
            ...data,
            media: data.media.map((m: any) => ({
                ...m,
                url: buildProxyUrl(m.url),
                previewUrl: m.previewUrl ? buildProxyUrl(m.previewUrl) : buildProxyUrl(m.url),
                isWatermarked: !!m.isWatermarked
            }))
        };
    },

    createEvent: async (event: Event): Promise<Event> => {
        return handleApiRequest(async () => {
            const res = await fetch(`${API_URL}/api/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify(event)
            });
            return res.json();
        });
    },

    updateEvent: async (event: Event): Promise<void> => {
        await fetch(`${API_URL}/api/events/${event.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify(event)
        });
    },

    deleteEvent: async (id: string): Promise<void> => {
        await fetch(`${API_URL}/api/events/${id}`, { method: 'DELETE', headers: { ...getAuthHeaders() } });
    },

    validateEventPin: async (id: string, pin: string): Promise<boolean> => {
        const res = await fetch(`${API_URL}/api/events/${id}/validate-pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin })
        });
        const data = await res.json();
        return data.success;
    },

    // --- VENDORS (NEW) ---
    fetchVendors: async (city?: string): Promise<Vendor[]> => {
        let url = `${API_URL}/api/vendors`;
        if (city) url += `?city=${encodeURIComponent(city)}`;
        const res = await fetch(url);
        if (!res.ok) return [];
        return res.json();
    },

    // --- MEDIA & AI ---
    uploadMedia: async (file: File, metadata: Partial<MediaItem>, eventId: string, onProgress?: (percent: number) => void): Promise<MediaItem> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('id', metadata.id!);
        formData.append('eventId', eventId);
        formData.append('type', metadata.type!);
        formData.append('caption', metadata.caption || '');
        formData.append('uploadedAt', metadata.uploadedAt!);
        formData.append('uploaderName', metadata.uploaderName!);
        formData.append('uploaderId', metadata.uploaderId || '');
        formData.append('isWatermarked', String(metadata.isWatermarked));
        formData.append('watermarkText', metadata.watermarkText || '');
        formData.append('privacy', metadata.privacy || 'public');

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_URL}/api/media`);
            const token = localStorage.getItem('snapify_token');
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

            xhr.onload = () => {
                console.log('Upload response - status:', xhr.status, 'response:', xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        console.log('Upload queued:', result);

                        // Poll for completion status
                        pollUploadStatus(result.uploadId, resolve, reject, onProgress);
                    } catch (e) {
                        console.error('JSON parse error:', e, 'response:', xhr.responseText);
                        reject(new Error('Invalid JSON response'));
                    }
                } else {
                    console.error('Upload failed - status:', xhr.status, 'statusText:', xhr.statusText, 'response:', xhr.responseText);
                    reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
                }
            };

            xhr.onerror = () => {
                console.error('Upload network error');
                reject(new Error('Network error during upload'));
            };

            xhr.ontimeout = () => {
                console.error('Upload timeout');
                reject(new Error('Upload timeout'));
            };

            xhr.timeout = 300000; // 5 minute timeout

            console.log('Starting upload to:', `${API_URL}/api/media`);
            xhr.send(formData);
        });
    },

    // Check upload status
    getUploadStatus: async (uploadId: string): Promise<{ status: string; progress: number; error?: string }> => {
        const res = await fetch(`${API_URL}/api/media/upload/${uploadId}/status`, { headers: { ...getAuthHeaders() } });
        if (!res.ok) throw new Error('Failed to get upload status');
        return res.json();
    },

    // Fetch media item by ID
    getMediaById: async (mediaId: string): Promise<MediaItem> => {
        const res = await fetch(`${API_URL}/api/media/${mediaId}`, { headers: { ...getAuthHeaders() } });
        if (!res.ok) throw new Error('Failed to fetch media item');
        const data = await res.json();
        return {
            ...data,
            url: buildProxyUrl(data.url),
            previewUrl: data.previewUrl ? buildProxyUrl(data.previewUrl) : buildProxyUrl(data.url)
        };
    },

    generateImageCaption: async (base64Image: string): Promise<string> => {
        const res = await fetch(`${API_URL}/api/ai/generate-caption`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ imageData: base64Image })
        });
        const data = await res.json();
        return data.caption || "Captured moment";
    },

    generateEventDescription: async (title: string, date: string, type: string): Promise<string> => {
        const res = await fetch(`${API_URL}/api/ai/generate-event-description`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ title, date, type })
        });
        const data = await res.json();
        return data.description || "Join us for an amazing celebration!";
    },

    generateGuestReviews: async (country: string, language: string, count: number = 6): Promise<any[]> => {
        const prompt = `Generate ${count} diverse, authentic guest feedback reviews for a web app called Snapify, an event-sharing platform. The reviews should be from users in ${country}, written in ${language}, and reflect local cultural contexts, experiences, and perspectives.

Requirements:
- Mix of positive, neutral, and constructive criticism tones
- Varied lengths (short to medium)
- Include subtle references to local customs, cuisine, traditions, or events relevant to ${country}
- Use colloquial language and varied formality levels
- Make them feel genuine and realistic
- Each review should be in ${language}

Return the reviews as a JSON array of objects, each with:
- "review": the review text in ${language}
- "translation": English translation if not English
- "tone": "positive", "neutral", or "constructive"
- "rationale": brief explanation of realism

Example structure:
[
  {
    "review": "Review text here",
    "translation": "English translation",
    "tone": "positive",
    "rationale": "Reflects local culture..."
  }
]`;

        const res = await fetch(`${API_URL}/api/ai/generate-guest-reviews`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ prompt, country, language, count })
        });
        const data = await res.json();
        return data.reviews || [];
    },

    likeMedia: async (id: string): Promise<void> => { await fetch(`${API_URL}/api/media/${id}/like`, { method: 'PUT' }); },
    deleteMedia: async (id: string): Promise<void> => { await fetch(`${API_URL}/api/media/${id}`, { method: 'DELETE', headers: { ...getAuthHeaders() } }); },

    bulkDeleteMedia: async (mediaIds: string[]): Promise<{ success: boolean; deletedCount: number }> => {
        const res = await fetch(`${API_URL}/api/media/bulk-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ mediaIds })
        });
        const data = await res.json();
        return { success: data.success || false, deletedCount: data.deletedCount || 0 };
    },

    addGuestbookEntry: async (entry: GuestbookEntry): Promise<GuestbookEntry> => {
        const res = await fetch(`${API_URL}/api/guestbook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
        });
        return res.json();
    },

    addComment: async (comment: Comment): Promise<Comment> => {
        const res = await fetch(`${API_URL}/api/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(comment)
        });
        return res.json();
    },


    getSystemStorage: async (): Promise<{
        system: { filesystem: string; size: string; used: string; available: string; usePercent: string };
        minio: { filesystem: string; size: string; used: string; available: string; usePercent: string };
        timestamp: string;
    }> => {
        return handleApiRequest(async () => {
            const res = await fetch(`${API_URL}/api/system/storage`, { headers: { ...getAuthHeaders() } });
            if (!res.ok) throw new Error("Failed to get storage info");
            return res.json();
        });
    },

    // --- SUPPORT CHAT ---
    getSupportMessages: async (): Promise<any[]> => {
        const res = await fetch(`${API_URL}/api/support/messages`, { headers: { ...getAuthHeaders() } });
        if (!res.ok) throw new Error("Failed to get support messages");
        return res.json();
    },

    sendAdminReply: async (userId: string, message: string): Promise<void> => {
        const res = await fetch(`${API_URL}/api/support/admin-reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ userId, message })
        });
        if (!res.ok) throw new Error("Failed to send reply");
    },

    markMessageAsRead: async (messageId: string): Promise<void> => {
        const res = await fetch(`${API_URL}/api/support/messages/${messageId}/read`, {
            method: 'PUT',
            headers: { ...getAuthHeaders() }
        });
        if (!res.ok) throw new Error("Failed to mark message as read");
    },

    // --- SYSTEM MANAGEMENT ---
    cleanMinIOBucket: async (): Promise<{ success: boolean; message: string; deletedCount: number; totalSize: string; timestamp: string }> => {
        const res = await fetch(`${API_URL}/api/system/clean-bucket`, {
            method: 'POST',
            headers: { ...getAuthHeaders() }
        });
        if (!res.ok) throw new Error("Failed to clean MinIO bucket");
        return res.json();
    },

    clearUsersDatabase: async (): Promise<{
        success: boolean;
        message: string;
        adminPreserved: string;
        totalDeleted: number;
        preCounts: Record<string, number>;
        postCounts: Record<string, number>;
        timestamp: string;
    }> => {
        const res = await fetch(`${API_URL}/api/system/clear-users`, {
            method: 'POST',
            headers: { ...getAuthHeaders() }
        });
        if (!res.ok) throw new Error("Failed to clear users database");
        return res.json();
    },

    // --- FEEDBACK SYSTEM ---
    submitFeedback: async (feedbackData: {
        userId: string;
        rating?: number;
        comments: string;
        category: 'bug' | 'feature-request' | 'improvement' | 'general';
        feature?: string;
        source: 'landing-page' | 'beta-modal';
        version: string;
    }): Promise<{ success: boolean; feedbackId: string }> => {
        const res = await fetch(`${API_URL}/api/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify(feedbackData)
        });
        if (!res.ok) throw new Error("Failed to submit feedback");
        return res.json();
    },

    getAllFeedback: async (): Promise<{
        feedbackItems: Array<{
            id: string;
            userId: string;
            userName: string;
            userEmail: string;
            rating?: number;
            comments: string;
            category: 'bug' | 'feature-request' | 'improvement' | 'general';
            feature?: string;
            source: 'landing-page' | 'beta-modal';
            version: string;
            submittedAt: string;
            status: 'new' | 'reviewed' | 'resolved';
        }>;
        stats: {
            totalFeedback: number;
            newFeedback: number;
            reviewedFeedback: number;
            resolvedFeedback: number;
            byCategory: Record<string, number>;
            bySource: Record<string, number>;
        };
    }> => {
        const res = await fetch(`${API_URL}/api/feedback`, { headers: { ...getAuthHeaders() } });
        if (!res.ok) throw new Error("Failed to fetch feedback");
        return res.json();
    },

    updateFeedbackStatus: async (feedbackId: string, status: 'new' | 'reviewed' | 'resolved'): Promise<void> => {
        const res = await fetch(`${API_URL}/api/feedback/${feedbackId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error("Failed to update feedback status");
    }
};

// Polling function for upload status
const pollUploadStatus = async (
    uploadId: string,
    resolve: (value: MediaItem) => void,
    reject: (reason: Error) => void,
    onProgress?: (percent: number) => void,
    maxAttempts: number = 60,
    interval: number = 2000
) => {
    let attempts = 0;

    const poll = async () => {
        try {
            attempts++;
            const status = await api.getUploadStatus(uploadId);

            // Update progress callback
            if (onProgress && status.progress !== undefined) {
                onProgress(status.progress);
            }

            if (status.status === 'completed') {
                // Fetch the actual media item from the database
                try {
                    const mediaItem = await api.getMediaById(uploadId);
                    resolve(mediaItem);
                } catch (fetchError) {
                    console.error('Failed to fetch completed media item:', fetchError);
                    // Fallback to placeholder if fetch fails
                    const placeholderItem: MediaItem = {
                        id: uploadId,
                        eventId: '',
                        type: 'image',
                        url: '',
                        caption: '',
                        uploadedAt: new Date().toISOString(),
                        uploaderName: '',
                        privacy: 'public'
                    };
                    resolve(placeholderItem);
                }
            } else if (status.status === 'failed') {
                reject(new Error(status.error || 'Upload failed'));
            } else if (attempts >= maxAttempts) {
                reject(new Error('Upload timeout'));
            } else {
                // Continue polling
                setTimeout(poll, interval);
            }
        } catch (error) {
            if (attempts >= maxAttempts) {
                reject(new Error('Upload status check failed'));
            } else {
                setTimeout(poll, interval);
            }
        }
    };

    poll();
};

// Enhanced helper function to handle 401 errors with token refresh
export const handleApiRequest = async (requestFn: () => Promise<any>): Promise<any> => {
    try {
        const result = await requestFn();

        // Check if the response has a 401 status (for fetch responses)
        if (result && typeof result.status === 'number' && result.status === 401) {
            throw new Error('Unauthorized');
        }

        return result;
    } catch (error: any) {
        // Check for 401 status in various error formats
        const isUnauthorized =
            error.message?.includes('Unauthorized') ||
            error.message?.includes('401') ||
            (error.response && error.response.status === 401) ||
            (error.status === 401);

        if (isUnauthorized) {
            try {
                console.log('Attempting token refresh due to 401 error');

                // Attempt token refresh
                const refreshResult = await api.refreshToken();
                const newToken = refreshResult.token;

                if (!newToken) {
                    throw new Error('No token received from refresh');
                }

                // Update the token in localStorage for both storage locations
                localStorage.setItem('snapify_token', newToken);
                localStorage.setItem('auth_token', newToken);

                console.log('Token refreshed successfully, retrying request');

                // Retry the original request with the new token
                return await requestFn();
            } catch (refreshError: any) {
                console.error('Token refresh failed:', refreshError);

                // Track authentication error
                trackError(`Token refresh failed: ${refreshError.message}`, 'API Token Refresh', 'high');

                // Clear invalid tokens
                localStorage.removeItem('snapify_token');
                localStorage.removeItem('auth_token');

                // Dispatch logout event for auth store
                window.dispatchEvent(new CustomEvent('auth:logout', {
                    detail: { reason: 'token_refresh_failed' }
                }));

                throw new Error('Session expired. Please log in again.');
            }
        }

        // Track API errors for monitoring
        if (error.response) {
            trackApiError('API Request', error.response.status, error.message);
        } else {
            trackError(error, 'API Request', 'medium');
        }

        // Re-throw non-401 errors
        throw error;
    }
};