import * as React from 'react';
const { useEffect } = React;

interface ShareTargetHandlerProps {
  onShareReceive: (text: string) => void;
}

export const ShareTargetHandler: React.FC<ShareTargetHandlerProps> = ({ onShareReceive }) => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const title = params.get('title');
    const text = params.get('text');
    const url = params.get('url');

    if (title || text || url) {
      const sharedContent = [title, text, url].filter(Boolean).join('\n');
      if (sharedContent) {
        onShareReceive(sharedContent);
        // Clean URL to prevent re-triggering on refresh
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [onShareReceive]);

  return null;
};