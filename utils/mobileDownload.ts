// Mobile download utilities for saving media to device galleries

import { isMobileDevice, isIOS, isAndroid } from './deviceDetection';

export interface DownloadResult {
    success: boolean;
    method: 'webshare' | 'pwa' | 'fallback' | 'none';
    message?: string;
}

/**
 * Check if Web Share API is supported for files
 */
export function supportsWebShare(): boolean {
    return typeof navigator !== 'undefined' &&
        'share' in navigator &&
        'canShare' in navigator;
}

/**
 * Check if PWA file handling is available
 */
export function supportsPWAFileHandling(): boolean {
    return typeof window !== 'undefined' &&
        'showSaveFilePicker' in window;
}

/**
 * Download media using Web Share API (best for mobile)
 */
export async function shareMediaToGallery(mediaUrl: string, filename: string): Promise<DownloadResult> {
    if (!supportsWebShare()) {
        return { success: false, method: 'none', message: 'Web Share API not supported' };
    }

    try {
        // Fetch the media
        const response = await fetch(mediaUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch media: ${response.status}`);
        }

        const blob = await response.blob();
        const file = new File([blob], filename, { type: blob.type });

        // Check if we can share this file
        if (!navigator.canShare({ files: [file] })) {
            return { success: false, method: 'webshare', message: 'File type not supported for sharing' };
        }

        // Share the file
        await navigator.share({
            files: [file],
            title: 'Save to Gallery'
        });

        return { success: true, method: 'webshare', message: 'Media shared successfully' };
    } catch (error) {
        console.warn('Web Share API failed:', error);
        return {
            success: false,
            method: 'webshare',
            message: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Download media using PWA file handling (for installed PWAs)
 */
export async function saveToGalleryPWA(mediaUrl: string, filename: string): Promise<DownloadResult> {
    if (!supportsPWAFileHandling()) {
        return { success: false, method: 'none', message: 'PWA file handling not supported' };
    }

    try {
        const response = await fetch(mediaUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch media: ${response.status}`);
        }

        const blob = await response.blob();
        const file = new File([blob], filename, { type: blob.type });

        // Get file extension for suggested name
        const extension = filename.split('.').pop() || 'jpg';
        const suggestedName = `snapify_${Date.now()}.${extension}`;

        // Show save file picker
        const handle = await (window as any).showSaveFilePicker({
            suggestedName,
            types: [{
                description: blob.type.startsWith('video') ? 'Video' : 'Image',
                accept: { [blob.type]: [`.${extension}`] }
            }]
        });

        const writable = await handle.createWritable();
        await writable.write(file);
        await writable.close();

        return { success: true, method: 'pwa', message: 'File saved successfully' };
    } catch (error) {
        console.warn('PWA file handling failed:', error);
        return {
            success: false,
            method: 'pwa',
            message: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Fallback download method (traditional anchor download)
 */
export async function fallbackDownload(mediaUrl: string, filename: string): Promise<DownloadResult> {
    try {
        const link = document.createElement('a');
        link.href = mediaUrl;
        link.download = filename;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return { success: true, method: 'fallback', message: 'Download initiated' };
    } catch (error) {
        console.warn('Fallback download failed:', error);
        return {
            success: false,
            method: 'fallback',
            message: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Main mobile download function with automatic method selection
 */
export async function downloadMediaForMobile(
    mediaUrl: string,
    filename: string,
    options: {
        preferWebShare?: boolean;
        showInstructions?: boolean;
    } = {}
): Promise<DownloadResult> {
    const { preferWebShare = true, showInstructions = true } = options;

    // Try Web Share API first (best for mobile)
    if (preferWebShare && isMobileDevice()) {
        const result = await shareMediaToGallery(mediaUrl, filename);
        if (result.success) {
            return result;
        }
    }

    // Try PWA file handling
    const pwaResult = await saveToGalleryPWA(mediaUrl, filename);
    if (pwaResult.success) {
        return pwaResult;
    }

    // Fallback to traditional download
    const fallbackResult = await fallbackDownload(mediaUrl, filename);

    // Show platform-specific instructions if requested
    if (showInstructions && !fallbackResult.success && isMobileDevice()) {
        showMobileInstructions(mediaUrl, filename);
    }

    return fallbackResult;
}

/**
 * Show platform-specific instructions for manual saving
 */
export function showMobileInstructions(mediaUrl: string, filename: string): void {
    const isIOSDevice = isIOS();
    const isAndroidDevice = isAndroid();

    let instructions = '';
    let title = 'Save to Gallery';

    if (isIOSDevice) {
        title = 'Save to Photos (iOS)';
        instructions = `
      <div class="text-center">
        <div class="mb-4">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">How to Save on iOS</h3>
        </div>
        <ol class="text-left text-sm text-gray-600 space-y-2 mb-4">
          <li class="flex items-start">
            <span class="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
            Tap and hold the image/video above
          </li>
          <li class="flex items-start">
            <span class="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
            Select "Save to Photos" from the menu
          </li>
          <li class="flex items-start">
            <span class="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
            The media will be saved to your Photos app
          </li>
        </ol>
        <button onclick="this.closest('.mobile-instructions-modal').remove()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Got it
        </button>
      </div>
    `;
    } else if (isAndroidDevice) {
        title = 'Save to Gallery (Android)';
        instructions = `
      <div class="text-center">
        <div class="mb-4">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">How to Save on Android</h3>
        </div>
        <ol class="text-left text-sm text-gray-600 space-y-2 mb-4">
          <li class="flex items-start">
            <span class="bg-green-100 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</span>
            Tap the download button above
          </li>
          <li class="flex items-start">
            <span class="bg-green-100 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</span>
            Open the downloaded file from notifications
          </li>
          <li class="flex items-start">
            <span class="bg-green-100 text-green-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</span>
            Tap "Save" or share to your Gallery app
          </li>
        </ol>
        <button onclick="this.closest('.mobile-instructions-modal').remove()" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
          Got it
        </button>
      </div>
    `;
    } else {
        title = 'Download Instructions';
        instructions = `
      <div class="text-center">
        <div class="mb-4">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Download Complete</h3>
        </div>
        <p class="text-sm text-gray-600 mb-4">
          The file has been downloaded. Check your downloads folder to save it to your gallery.
        </p>
        <button onclick="this.closest('.mobile-instructions-modal').remove()" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
          Close
        </button>
      </div>
    `;
    }

    // Create and show modal
    const modal = document.createElement('div');
    modal.className = 'mobile-instructions-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
    <div class="bg-white rounded-lg max-w-sm w-full max-h-[90vh] overflow-y-auto">
      <div class="p-6">
        ${instructions}
      </div>
    </div>
  `;

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    document.body.appendChild(modal);
}

/**
 * Get filename from media URL or generate one
 */
export function generateFilename(mediaUrl: string, mediaType: 'image' | 'video', originalFilename?: string): string {
    if (originalFilename) {
        return originalFilename;
    }

    // Extract filename from URL or generate one
    const urlParts = mediaUrl.split('/');
    const urlFilename = urlParts[urlParts.length - 1];
    const extension = mediaType === 'video' ? 'mp4' : 'jpg';

    if (urlFilename && urlFilename.includes('.')) {
        return urlFilename;
    }

    return `snapify_${Date.now()}.${extension}`;
}