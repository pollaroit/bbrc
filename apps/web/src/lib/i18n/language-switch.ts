/**
 * The language picker (Preferences and the user menu) is hidden until the Azerbaijani texts
 * are ready. One switch for both: `NEXT_PUBLIC_LANGUAGE_SWITCH=true` in the environment.
 */
export function isLanguageSwitchEnabled(): boolean {
	return process.env.NEXT_PUBLIC_LANGUAGE_SWITCH === "true";
}
