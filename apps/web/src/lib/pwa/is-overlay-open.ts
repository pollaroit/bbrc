/** True when a modal, sheet, or menu is open — pull-to-refresh should stand down. */
export function isOverlayOpen(): boolean {
	return Boolean(
		document.querySelector(
			'[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
		),
	);
}
