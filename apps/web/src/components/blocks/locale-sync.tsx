"use client";

import { LOCALE_COOKIE, type Locale, toLocale } from "@bbrc/i18n";
import { useLocale } from "next-intl";
import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import {
	markSyncedUser,
	readSyncedUser,
	writeLocaleCookie,
} from "@/lib/i18n/page-locale";

/**
 * Once per browser tab session after a member is signed in: the language they saved (on this
 * or another device) becomes the cookie, and the page opens in it when it is in another one.
 * Picking a language in this tab marks the sync as done, so the two never fight.
 */
export function LocaleSync() {
	const pageLocale = useLocale() as Locale;
	const router = useRouter();
	const pathname = usePathname();
	const { data: session } = authClient.useSession();
	const userId = session?.user?.id;
	const savedRaw = (session?.user as { locale?: string } | undefined)?.locale;

	useEffect(() => {
		if (!userId || !savedRaw) return;
		if (readSyncedUser() === userId) return;
		markSyncedUser(userId);

		const saved = toLocale(savedRaw);
		writeLocaleCookie(saved, LOCALE_COOKIE);
		if (saved !== pageLocale) {
			const { search, hash } = window.location;
			router.replace(`${pathname}${search}${hash}`, { locale: saved });
		}
	}, [userId, savedRaw, pageLocale, pathname, router]);

	return null;
}
