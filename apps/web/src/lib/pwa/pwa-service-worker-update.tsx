"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { isStandalonePwa } from "@/lib/pwa/is-standalone";

const SKIP_WAITING = { type: "SKIP_WAITING" } as const;

function promptReload(waiting: ServiceWorker) {
	toast("Update ready", {
		description: "Reload to use the latest version.",
		duration: Number.POSITIVE_INFINITY,
		action: {
			label: "Reload",
			onClick: () => {
				waiting.postMessage(SKIP_WAITING);
			},
		},
	});
}

export function PwaServiceWorkerUpdate() {
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
				promptReload(registration.waiting);
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
						promptReload(registration.waiting);
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
	}, []);

	return null;
}
