"use client";

import { getMessages } from "@bbrc/i18n";
import { OfflineActions } from "@/app/(plain)/~offline/offline-actions";
import { Logo } from "@/components/blocks/logo";
import { useCookieLocale } from "@/lib/i18n/use-cookie-locale";

/** The offline screen in the visitor's saved language (the page itself is built once, in English). */
export function OfflineView() {
	const locale = useCookieLocale();
	const text = getMessages(locale).shell.offline;

	return (
		<div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-6 py-12 text-center">
			<Logo className="size-16" label="BBRC" />
			<div className="flex max-w-[32ch] flex-col gap-2">
				<h1 className="font-bold text-xl tracking-tight">{text.title}</h1>
				<p className="text-muted-foreground text-sm leading-relaxed">
					{text.body}
				</p>
			</div>
			<OfflineActions tryAgain={text.tryAgain} goHome={text.goHome} />
		</div>
	);
}
