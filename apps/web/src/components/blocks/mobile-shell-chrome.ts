/** Shared surface styles for mobile app chrome (top + bottom bars). */
export const mobileChromeBarClass =
	"fixed inset-x-0 z-50 border-border bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/85 md:hidden";

export const mobileChromeTopClass = `${mobileChromeBarClass} top-0 border-b pt-[env(safe-area-inset-top)]`;

export const mobileChromeBottomClass = `${mobileChromeBarClass} bottom-0 border-t pb-[env(safe-area-inset-bottom)]`;
