/**
 * MediaGrid Virtual Scrolling Tests
 * Tests for the enhanced virtual scrolling implementation
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MediaGrid } from '../MediaGrid';
import { VirtuosoGrid } from 'react-virtuoso';
import { MediaItem, UserRole, TierLevel } from '../../../../types';

// Mock data for testing
const mockEvent = {
    id: 'test-event',
    title: 'Test Event',
    description: 'Test Event Description',
    date: new Date().toISOString(),
    hostId: 'host-1',
    code: 'TEST123',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    media: [],
    guestbook: []
};

const mockCurrentUser = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: UserRole.USER,
    tier: TierLevel.FREE,
    storageUsedMb: 100,
    storageLimitMb: 1000,
    joinedDate: new Date().toISOString()
};

const mockMediaItems: MediaItem[] = [
    {
        id: 'media-1',
        eventId: 'test-event',
        url: 'https://example.com/image1.jpg',
        previewUrl: 'https://example.com/preview1.jpg',
        type: 'image',
        caption: 'Test Image 1',
        uploaderName: 'Test User',
        likes: 5,
        comments: [],
        privacy: 'public',
        isProcessing: false,
        uploadedAt: new Date().toISOString()
    },
    {
        id: 'media-2',
        eventId: 'test-event',
        url: 'https://example.com/image2.jpg',
        previewUrl: 'https://example.com/preview2.jpg',
        type: 'image',
        caption: 'Test Image 2',
        uploaderName: 'Test User',
        likes: 3,
        comments: [],
        privacy: 'public',
        isProcessing: false,
        uploadedAt: new Date().toISOString()
    },
    {
        id: 'media-3',
        eventId: 'test-event',
        url: 'https://example.com/video1.mp4',
        previewUrl: 'https://example.com/preview1.mp4',
        type: 'video',
        caption: 'Test Video 1',
        uploaderName: 'Test User',
        likes: 8,
        comments: [],
        privacy: 'public',
        isProcessing: false,
        uploadedAt: new Date().toISOString()
    }
];

describe('MediaGrid Virtual Scrolling Implementation', () => {
    const mockTranslate = (key: string) => key;

    it('should render MediaGrid with virtual scrolling', () => {
        render(
            <MediaGrid
                event={mockEvent}
                currentUser={mockCurrentUser}
                isOwner={true}
                isBulkDeleteMode={false}
                selectedMedia={new Set()}
                displayMedia={mockMediaItems}
                onLike={jest.fn()}
                onSetCover={jest.fn()}
                openLightbox={jest.fn()}
                t={mockTranslate}
            />
        );

        // Check if VirtuosoGrid is rendered
        const virtuosoGrid = screen.getByTestId('media-grid-virtuoso');
        expect(virtuosoGrid).toBeInTheDocument();

        // Check if grid items are rendered
        expect(screen.getByText('Test Image 1')).toBeInTheDocument();
        expect(screen.getByText('Test Image 2')).toBeInTheDocument();
        expect(screen.getByText('Test Video 1')).toBeInTheDocument();
    });

    it('should render add memory card when user is owner', () => {
        render(
            <MediaGrid
                event={mockEvent}
                currentUser={mockCurrentUser}
                isOwner={true}
                isBulkDeleteMode={false}
                selectedMedia={new Set()}
                displayMedia={mockMediaItems}
                onLike={jest.fn()}
                onSetCover={jest.fn()}
                openLightbox={jest.fn()}
                t={mockTranslate}
            />
        );

        // Check if add memory card is rendered
        expect(screen.getByText('addMemory')).toBeInTheDocument();
        expect(screen.getByText('tapToUpload')).toBeInTheDocument();
    });

    it('should not render add memory card in bulk delete mode', () => {
        render(
            <MediaGrid
                event={mockEvent}
                currentUser={mockCurrentUser}
                isOwner={true}
                isBulkDeleteMode={true}
                selectedMedia={new Set()}
                displayMedia={mockMediaItems}
                onLike={jest.fn()}
                onSetCover={jest.fn()}
                openLightbox={jest.fn()}
                t={mockTranslate}
            />
        );

        // Check if add memory card is not rendered in bulk mode
        expect(screen.queryByText('addMemory')).not.toBeInTheDocument();
    });

    it('should handle lightbox opening when clicking media items', () => {
        const mockOpenLightbox = jest.fn();

        render(
            <MediaGrid
                event={mockEvent}
                currentUser={mockCurrentUser}
                isOwner={true}
                isBulkDeleteMode={false}
                selectedMedia={new Set()}
                displayMedia={mockMediaItems}
                onLike={jest.fn()}
                onSetCover={jest.fn()}
                openLightbox={mockOpenLightbox}
                t={mockTranslate}
            />
        );

        // Click on first media item
        const mediaItem = screen.getByText('Test Image 1').closest('div');
        if (mediaItem) {
            fireEvent.click(mediaItem);
            expect(mockOpenLightbox).toHaveBeenCalledWith(0);
        }
    });

    it('should handle like functionality', () => {
        const mockOnLike = jest.fn();

        render(
            <MediaGrid
                event={mockEvent}
                currentUser={mockCurrentUser}
                isOwner={true}
                isBulkDeleteMode={false}
                selectedMedia={new Set()}
                displayMedia={mockMediaItems}
                onLike={mockOnLike}
                onSetCover={jest.fn()}
                openLightbox={jest.fn()}
                t={mockTranslate}
            />
        );

        // Click on like button
        const likeButtons = screen.getAllByRole('button');
        const likeButton = likeButtons.find(button => button.textContent?.includes('5'));
        if (likeButton) {
            fireEvent.click(likeButton);
            expect(mockOnLike).toHaveBeenCalledWith(mockMediaItems[0]);
        }
    });
});