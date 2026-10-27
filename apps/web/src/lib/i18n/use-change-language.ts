"use client";

import { createServerTranslator, LOCALE_COOKIE, type Locale } from "@bbrc/i18n";
import { useMutation } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { usePathname, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { markSyncedUser, writeLocaleCookie } from "@/lib/i18n/page-locale";
import { refreshAuthSession } from "@/lib/refresh-auth-session";
import { orpc } from "@/utils/orpc";

/**
 * Changes the language: sets the cookie, saves it for a signed-in member (so every device gets
 * it) and opens the same page in the new language. A failed save puts everything back.
 */
export function useChangeLanguage() {
	const current = useLocale() as Locale;
	const router = useRouter();
	const pathname = usePathname();
	const { data: session } = authClient.useSession();
	const save = useMutation(orpc.user.setLocale.mutationOptions());

	function openIn(locale: Locale) {
		const { search, hash } = window.location;
		router.replace(`${pathname}${search}${hash}`, { locale });
	}

	function change(next: Locale) {
		if (next === current) return;
		const previous = current;
		const t = createServerTranslator(next, "language");

		writeLocaleCookie(next, LOCALE_COOKIE);
		const userId = session?.user?.id;
		// This tab chose the language, so the sign-in sync must not undo it.
		if (userId) markSyncedUser(userId);
		openIn(next);

		if (!userId) return;
		save.mutate(
			{ locale: next },
			{
				onSuccess: () => {
					toast.success(t("saved"));
					void refreshAuthSession();
				},
				onError: () => {
					writeLocaleCookie(previous, LOCALE_COOKIE);
					openIn(previous);
					toast.error(createServerTranslator(previous, "language")("failed"));
				},
			},
		);
	}

	return { current, change, isSaving: save.isPending };
}
