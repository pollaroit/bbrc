"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { isStandalonePwa } from "@/lib/pwa/is-standalone";

const SKIP_WAITING = { type: "SKIP_WAITING" } as const;

function promptReload(
	waiting: ServiceWorker,
	t: ReturnType<typeof useTranslations<"shell.pwa">>,
) {
	toast(t("updateReady"), {
		description: t("updateDescription"),
		duration: Number.POSITIVE_INFINITY,
		action: {
			label: t("reload"),
			onClick: () => {
				waiting.postMessage(SKIP_WAITING);
			},
		},
	});
}

export function PwaServiceWorkerUpdate() {
	const t = useTranslations("shell.pwa");
	const reloaded = useRef(false);

	useEffect(() => {
		if (!isStandalonePwa() || !("serviceWorker" in navigator)) {
			return;
		}

		const onControllerChange = () => {
			if (reloaded.current) {
				return;
			}
			reloaded.current = true;
			window.location.reload();
		};

		navigator.serviceWorker.addEventListener(
			"controllerchange",
			onControllerChange,
		);

		const watchRegistration = (registration: ServiceWorkerRegistration) => {
			if (registration.waiting) {
				promptReload(registration.waiting, t);
			}

			registration.addEventListener("updatefound", () => {
				const installing = registration.installing;
				if (!installing) {
					return;
				}

				installing.addEventListener("statechange", () => {
					if (
						installing.state === "installed" &&
						navigator.serviceWorker.controller &&
						registration.waiting
					) {
						promptReload(registration.waiting, t);
					}
				});
			});
		};

		void navigator.serviceWorker.ready.then(watchRegistration);

		return () => {
			navigator.serviceWorker.removeEventListener(
				"controllerchange",
				onControllerChange,
			);
		};
	}, [t]);

	return null;
}
