"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import { Field, FieldLabel } from "@bbrc/ui/components/field";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { isStandalonePwa } from "@/lib/pwa/is-standalone";
import {
	readPwaEngagementPreferences,
	writePwaEngagementPreferences,
} from "@/lib/pwa/pwa-engagement-storage";

export function PwaEngagementSettingsCard() {
	const [soundsEnabled, setSoundsEnabled] = useState(false);
	const [systemAlertsEnabled, setSystemAlertsEnabled] = useState(false);
	const [notificationPermission, setNotificationPermission] =
		useState<NotificationPermission>("default");
	const installed = isStandalonePwa();

	useEffect(() => {
		const prefs = readPwaEngagementPreferences();
		setSoundsEnabled(prefs.soundsEnabled);
		setSystemAlertsEnabled(prefs.systemAlertsEnabled);
		if ("Notification" in window) {
			setNotificationPermission(Notification.permission);
		}
	}, []);

	const persist = (next: {
		soundsEnabled: boolean;
		systemAlertsEnabled: boolean;
	}) => {
		writePwaEngagementPreferences(next);
		setSoundsEnabled(next.soundsEnabled);
		setSystemAlertsEnabled(next.systemAlertsEnabled);
	};

	const requestSystemAlerts = async () => {
		if (!("Notification" in window)) {
			toast.error("This browser does not support system alerts.");
			return;
		}

		const permission = await Notification.requestPermission();
		setNotificationPermission(permission);

		if (permission === "granted") {
			persist({ soundsEnabled, systemAlertsEnabled: true });
			toast.success("System alerts turned on");
			return;
		}

		persist({ soundsEnabled, systemAlertsEnabled: false });
		if (permission === "denied") {
			toast.error("Allow notifications in browser settings to use this.");
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">
					{installed ? "Installed app" : "App-style alerts"}
				</CardTitle>
				<CardDescription>
					{installed
						? "Sounds and system banners while BBRC runs from your home screen. For phone push when the app is fully closed, use ntfy below."
						: "Optional feedback when new bell alerts arrive while this tab is open or in the background. Install BBRC for the full experience."}
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<Field orientation="horizontal">
					<Checkbox
						id="pwa-sounds"
						checked={soundsEnabled}
						onCheckedChange={(checked) => {
							persist({
								soundsEnabled: checked === true,
								systemAlertsEnabled,
							});
						}}
					/>
					<FieldLabel htmlFor="pwa-sounds">
						Play a short sound for new bell alerts
					</FieldLabel>
				</Field>

				<Field orientation="horizontal">
					<Checkbox
						id="pwa-system-alerts"
						checked={
							systemAlertsEnabled && notificationPermission === "granted"
						}
						disabled={notificationPermission === "denied"}
						onCheckedChange={(checked) => {
							if (checked === true) {
								void requestSystemAlerts();
								return;
							}
							persist({ soundsEnabled, systemAlertsEnabled: false });
						}}
					/>
					<FieldLabel htmlFor="pwa-system-alerts">
						Show a system banner when the app is in the background
					</FieldLabel>
				</Field>

				{notificationPermission === "default" ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="w-fit"
						onClick={() => void requestSystemAlerts()}
					>
						Allow system alerts
					</Button>
				) : null}

				<p className="text-muted-foreground text-xs leading-relaxed">
					These use the same bell feed as the site. They do not replace ntfy
					push when BBRC is closed. Web Push in the service worker is planned
					for a later release.
				</p>
			</CardContent>
		</Card>
	);
}
