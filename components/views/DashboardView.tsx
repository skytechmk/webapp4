import React from 'react';
import { User, Event, TranslateFn } from '../../types';
// import { AdminDashboard } from '../AdminDashboard';
// import { UserDashboard } from '../UserDashboard';
import { ShieldAlert, LogIn } from 'lucide-react';
// import { ErrorBoundary } from '../ErrorBoundary';

interface DashboardViewProps {
  view: 'admin' | 'dashboard';
  currentUser: User | null;
  allUsers: User[];
  events: Event[];
  onClose: () => void;
  onLogout: () => void;
  onDeleteUser: (id: string) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  onDeleteMedia: (eventId: string, mediaId: string) => Promise<void>;
  onUpdateEvent: (event: Event) => Promise<void>;
  onUpdateUser: (user: User) => Promise<void>;
  onNewEvent: () => void;
  onDownloadEvent: (event: Event) => Promise<void>;
  onSelectEvent: (id: string) => void;
  onRequestUpgrade: () => void;
  t: TranslateFn;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  view,
  currentUser,
  allUsers,
  events,
  onClose,
  onLogout,
  onDeleteUser,
  onDeleteEvent,
  onDeleteMedia,
  onUpdateEvent,
  onUpdateUser,
  onNewEvent,
  onDownloadEvent,
  onSelectEvent,
  onRequestUpgrade,
  t
}) => {
  console.log('DashboardView render', { view, currentUserRole: currentUser?.role });

  const renderContent = () => {
    console.log('DashboardView renderContent called', { view, hasCurrentUser: !!currentUser, userRole: currentUser?.role });

    if (view === 'admin') {
      console.log('DashboardView checking admin access', { userRole: currentUser?.role, isEqual: currentUser?.role === 'ADMIN' });

      if (currentUser?.role === 'ADMIN') {
        // FIXED: Restore AdminDashboard with proper imports and error boundary
        const AdminDashboard = React.lazy(() => import('../AdminDashboard').then(module => ({ default: module.AdminDashboard })));
        const ErrorBoundary = React.lazy(() => import('../ErrorBoundary').then(module => ({ default: module.ErrorBoundary })));

        return (
          <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-pulse text-slate-500">Loading Admin Dashboard...</div></div>}>
            <ErrorBoundary>
              <AdminDashboard
                users={allUsers}
                events={events}
                onClose={onClose}
                onLogout={onLogout}
                onDeleteUser={onDeleteUser}
                onDeleteEvent={onDeleteEvent}
                onDeleteMedia={onDeleteMedia}
                onUpdateEvent={onUpdateEvent}
                onUpdateUser={onUpdateUser}
                onNewEvent={onNewEvent}
                onDownloadEvent={onDownloadEvent}
                t={t}
              />
            </ErrorBoundary>
          </React.Suspense>
        );
      } else {
        // User doesn't have admin permissions
        return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <ShieldAlert className="text-red-600" size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
              <p className="text-slate-500 mb-6">You don't have administrator permissions to access this page.</p>
              <button
                onClick={onClose}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        );
      }
    }

    if (view === 'dashboard') {
      if (currentUser) {
        // FIXED: Restore UserDashboard with lazy loading
        const UserDashboard = React.lazy(() => import('../UserDashboard').then(module => ({ default: module.UserDashboard })));

        return (
          <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-pulse text-slate-500">Loading Dashboard...</div></div>}>
            <UserDashboard
              events={events}
              currentUser={currentUser}
              onNewEvent={onNewEvent}
              onSelectEvent={onSelectEvent}
              onRequestUpgrade={onRequestUpgrade}
              t={t}
            />
          </React.Suspense>
        );
      } else {
        // No user logged in
        return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100">
                <LogIn className="text-amber-600" size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Please Sign In</h2>
              <p className="text-slate-500 mb-6">You need to be logged in to access your dashboard.</p>
              <button
                onClick={onClose}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        );
      }
    }

    return null;
  };

  return renderContent();
};