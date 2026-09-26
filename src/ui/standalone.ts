// Safari deletes the stored data of websites that are not opened for a week; an app added to the
// Home Screen keeps it. These helpers decide when to remind a grown-up.

/** iPhone or iPad (iPadOS Safari reports itself as a Mac with a touch screen). */
export function isAppleTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** Opened from the Home Screen rather than in a Safari tab. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

const DISMISSED_KEY = 'ks2-sats/home-screen-tip';

export function homeScreenTipDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissHomeScreenTip(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, '1');
  } catch {
    // not saved: the tip shows again next time
  }
}
