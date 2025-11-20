// Device detection utilities
export const isMobileDevice = (): boolean => {
  // Check for touch support and screen size
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  
  // Check user agent for mobile devices
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  
  return hasTouch && (isSmallScreen || isMobileUA);
};

export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

export const isAndroid = (): boolean => {
  return /Android/.test(navigator.userAgent);
};

export const isTablet = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  const isTabletUA = /(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(userAgent);
  const isLargeScreen = window.innerWidth > 768 && window.innerWidth <= 1024;
  
  return isTabletUA || isLargeScreen;
};
