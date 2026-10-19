"use client";

import { Button } from "@bbrc/ui/components/button";
import { Share, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { BodyPortal } from "@/components/blocks/body-portal";
import { mobileChromeInsetClass } from "@/components/blocks/mobile-shell-chrome";
import {
	type BeforeInstallPromptEvent,
	isBeforeInstallPromptEvent,
} from "@/lib/pwa/before-install-prompt";
import {
	isIosHomeScreenCapable,
	isMobileBrowser,
} from "@/lib/pwa/is-mobile-browser";
import { isStandalonePwa } from "@/lib/pwa/is-standalone";
import {
	isPwaInstallPromptRejected,
	markPwaInstallPromptRejected,
} from "@/lib/pwa/pwa-install-prompt-storage";
import { cn } from "@/lib/utils";

export function PwaInstallHint() {
	const [visible, setVisible] = useState(false);
	const [iosHint, setIosHint] = useState(false);
	const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

	useEffect(() => {
		if (
			!isMobileBrowser() ||
			isStandalonePwa() ||
			isPwaInstallPromptRejected()
		) {
			return;
		}

		const ios = isIosHomeScreenCapable();
		setIosHint(ios);

		const onBeforeInstall = (event: Event) => {
			if (!isBeforeInstallPromptEvent(event)) {
				return;
			}
			event.preventDefault();
			deferredPrompt.current = event;
			setVisible(true);
		};

		window.addEventListener("beforeinstallprompt", onBeforeInstall);

		if (ios) {
			const timer = window.setTimeout(() => setVisible(true), 4000);
			return () => {
				window.clearTimeout(timer);
				window.removeEventListener("beforeinstallprompt", onBeforeInstall);
			};
		}

		return () => {
			window.removeEventListener("beforeinstallprompt", onBeforeInstall);
		};
	}, []);

	const dismiss = useCallback(() => {
		markPwaInstallPromptRejected();
		setVisible(false);
		deferredPrompt.current = null;
	}, []);

	const onInstall = useCallback(async () => {
		const prompt = deferredPrompt.current;
		if (!prompt) {
			return;
		}
		await prompt.prompt();
		const { outcome } = await prompt.userChoice;
		deferredPrompt.current = null;
		if (outcome === "accepted") {
			setVisible(false);
			return;
		}
		dismiss();
	}, [dismiss]);

	if (!visible) {
		return null;
	}

	return (
		<BodyPortal>
			<section
				className={cn(
					"fixed inset-x-0 z-[45] border-border border-t bg-background shadow-sm md:hidden",
					mobileChromeInsetClass,
					"bottom-[calc(4.5rem+var(--pwa-vv-bottom,0px))] py-3",
				)}
				aria-label="Install BBRC"
			>
				<div className="mx-auto flex w-full max-w-6xl gap-3">
					<div className="min-w-0 flex-1">
						<p className="font-medium text-foreground text-sm">
							Add BBRC to your home screen
						</p>
						{iosHint ? (
							<p className="mt-1 text-muted-foreground text-xs leading-relaxed">
								Tap{" "}
								<Share
									className="inline size-3.5 align-[-2px] text-foreground"
									aria-hidden
								/>{" "}
								Share, then choose Add to Home Screen for a full-screen app.
							</p>
						) : (
							<p className="mt-1 text-muted-foreground text-xs leading-relaxed">
								Install for faster access, pull to refresh, and a stable tab
								bar.
							</p>
						)}
					</div>
					<div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
						{!iosHint && deferredPrompt.current ? (
							<Button type="button" size="sm" onClick={() => void onInstall()}>
								Install
							</Button>
						) : null}
						<Button type="button" size="sm" variant="outline" onClick={dismiss}>
							Not now
						</Button>
						<button
							type="button"
							className="inline-flex size-9 items-center justify-center border border-border text-muted-foreground hover:text-foreground"
							onClick={dismiss}
							aria-label="Dismiss install hint permanently"
						>
							<X className="size-4" aria-hidden />
						</button>
					</div>
				</div>
			</section>
		</BodyPortal>
	);
}
