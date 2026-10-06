/** Shared surface styles for mobile app chrome (top + bottom bars). */
export const mobileChromeBarClass =
	"fixed inset-x-0 z-50 border-border bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/85 md:hidden";

/** Inner padding so tab labels clear curved display edges and home indicator. */
export const mobileChromeInsetClass =
	"pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))]";

export const mobileChromeTopClass = `${mobileChromeBarClass} top-0 border-b pt-[max(0.25rem,env(safe-area-inset-top))]`;

export const mobileChromeBottomClass = `${mobileChromeBarClass} bottom-0 border-t`;

/** Bottom inset for main content below the tab bar (bar height + safe area). */
export const mobileMainBottomPaddingClass =
	"pb-[calc(4.5rem+max(0.75rem,env(safe-area-inset-bottom)))]";
