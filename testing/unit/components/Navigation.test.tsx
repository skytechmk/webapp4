/**
 * Enhanced Navigation Component Unit Tests
 * Comprehensive test coverage for Navigation component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Navigation } from '../../../components/Navigation';
import { UserRole, TierLevel } from '../../../types';

// Mock the required modules
jest.mock('../../../../services/socketService', () => ({
    socketService: {
        connect: jest.fn(),
        disconnect: jest.fn(),
        on: jest.fn(),
        off: jest.fn()
    }
}));

describe('Navigation Component - Comprehensive Unit Tests', () => {
    const mockProps = {
        currentUser: null,
        guestName: '',
        view: 'landing' as const,
        currentEventTitle: '',
        language: 'en' as const,
        onChangeLanguage: jest.fn(),
        onLogout: jest.fn(),
        onSignIn: jest.fn(),
        onHome: jest.fn(),
        onBack: jest.fn(),
        onToAdmin: jest.fn(),
        onOpenSettings: jest.fn(),
        t: (key: string) => key
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering Tests', () => {
        test('should render navigation for guest user', () => {
            render(<Navigation {...mockProps} />);

            expect(screen.getByText('SnapifY')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'signIn' })).toBeInTheDocument();
        });

        test('should render navigation for logged in user', () => {
            const userProps = {
                ...mockProps,
                currentUser: {
                    id: '1',
                    name: 'Test User',
                    email: 'test@example.com',
                    role: UserRole.USER,
                    tier: TierLevel.FREE,
                    storageUsedMb: 0,
                    storageLimitMb: 100,
                    joinedDate: '2024-01-01'
                }
            };

            render(<Navigation {...userProps} />);

            expect(screen.getByText('SnapifY')).toBeInTheDocument();
            expect(screen.getByText('Test User')).toBeInTheDocument();
        });

        test('should render admin navigation for admin user', () => {
            const adminProps = {
                ...mockProps,
                currentUser: {
                    id: '1',
                    name: 'Admin User',
                    email: 'admin@example.com',
                    role: UserRole.ADMIN,
                    tier: TierLevel.STUDIO,
                    storageUsedMb: 0,
                    storageLimitMb: -1,
                    joinedDate: '2024-01-01'
                },
                view: 'admin' as const
            };

            render(<Navigation {...adminProps} />);

            expect(screen.getByText('SnapifY')).toBeInTheDocument();
            expect(screen.getByText('adminDashboard')).toBeInTheDocument();
        });

        test('should show guest name when available', () => {
            const guestProps = {
                ...mockProps,
                guestName: 'Guest User'
            };

            render(<Navigation {...guestProps} />);

            expect(screen.getByText('Guest User')).toBeInTheDocument();
        });
    });

    describe('Interaction Tests', () => {
        test('should call onSignIn when sign in button is clicked', () => {
            render(<Navigation {...mockProps} />);

            fireEvent.click(screen.getByRole('button', { name: 'signIn' }));
            expect(mockProps.onSignIn).toHaveBeenCalled();
        });

        test('should call onLogout when logout button is clicked', () => {
            const userProps = {
                ...mockProps,
                currentUser: {
                    id: '1',
                    name: 'Test User',
                    email: 'test@example.com',
                    role: UserRole.USER,
                    tier: TierLevel.FREE,
                    storageUsedMb: 0,
                    storageLimitMb: 100,
                    joinedDate: '2024-01-01'
                }
            };

            render(<Navigation {...userProps} />);

            fireEvent.click(screen.getByRole('button', { name: 'logout' }));
            expect(mockProps.onLogout).toHaveBeenCalled();
        });
    });

    describe('Language Switching Tests', () => {
        test('should call onChangeLanguage when language is changed', () => {
            render(<Navigation {...mockProps} />);

            const languageSelector = screen.getByRole('combobox', { name: 'languageSelector' });
            fireEvent.change(languageSelector, { target: { value: 'mk' } });

            expect(mockProps.onChangeLanguage).toHaveBeenCalledWith('mk');
        });
    });
});