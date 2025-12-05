import React from 'react';
import { User, Event, MediaItem, TranslateFn } from '../../types';
import { EventGallery } from '../EventGallery';
import { LiveSlideshow } from '../LiveSlideshow';

interface EventViewProps {
  view: 'event' | 'live';
  activeEvent: Event | undefined;
  currentUser: User | null;
  hostUser: User | undefined;
  isEventExpired: boolean;
  isOwner: boolean;
  isHostPhotographer: boolean;
  downloadingZip: boolean;
  applyWatermark: boolean;
  setApplyWatermark: (value: boolean) => void;
  onDownloadAll: (media?: MediaItem[]) => Promise<void>;
  onSetCover: (item: MediaItem) => Promise<void>;
  onUpload: (action: 'upload' | 'camera') => void;
  onLike: (item: MediaItem) => Promise<void>;
  onOpenLiveSlideshow: () => void;
  onCloseLiveSlideshow: () => void;
  t: TranslateFn;
}

export const EventView: React.FC<EventViewProps> = ({
  view,
  activeEvent,
  currentUser,
  hostUser,
  isEventExpired,
  isOwner,
  isHostPhotographer,
  downloadingZip,
  applyWatermark,
  setApplyWatermark,
  onDownloadAll,
  onSetCover,
  onUpload,
  onLike,
  onOpenLiveSlideshow,
  onCloseLiveSlideshow,
  t
}) => {
  if (view === 'event' && activeEvent) {
    return (
      <EventGallery
        key={activeEvent.id}
        event={activeEvent}
        currentUser={currentUser}
        hostUser={hostUser}
        isEventExpired={isEventExpired}
        isOwner={isOwner}
        isHostPhotographer={isHostPhotographer}
        downloadingZip={downloadingZip}
        applyWatermark={applyWatermark}
        setApplyWatermark={setApplyWatermark}
        onDownloadAll={onDownloadAll}
        onSetCover={onSetCover}
        onUpload={onUpload}
        onLike={onLike}
        onOpenLiveSlideshow={onOpenLiveSlideshow}
        t={t}
      />
    );
  }

  if (view === 'live' && activeEvent) {
    return (
      <LiveSlideshow
        event={activeEvent}
        currentUser={currentUser}
        hostUser={hostUser}
        onClose={onCloseLiveSlideshow}
        t={t}
      />
    );
  }

  return null;
};