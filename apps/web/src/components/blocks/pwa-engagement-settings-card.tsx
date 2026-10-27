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
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { isStandalonePwa } from "@/lib/pwa/is-standalone";
import {
	readPwaEngagementPreferences,
	writePwaEngagementPreferences,
} from "@/lib/pwa/pwa-engagement-storage";

export function PwaEngagementSettingsCard() {
	const t = useTranslations("settings.pwaAlerts");
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
			toast.error(t("unsupported"));
			return;
		}

		const permission = await Notification.requestPermission();
		setNotificationPermission(permission);

		if (permission === "granted") {
			persist({ soundsEnabled, systemAlertsEnabled: true });
			toast.success(t("turnedOn"));
			return;
		}

		persist({ soundsEnabled, systemAlertsEnabled: false });
		if (permission === "denied") {
			toast.error(t("denied"));
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">
					{installed ? t("installedTitle") : t("title")}
				</CardTitle>
				<CardDescription>
					{installed ? t("installedDescription") : t("description")}
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
					<FieldLabel htmlFor="pwa-sounds">{t("sound")}</FieldLabel>
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
					<FieldLabel htmlFor="pwa-system-alerts">{t("banner")}</FieldLabel>
				</Field>

				{notificationPermission === "default" ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="w-fit"
						onClick={() => void requestSystemAlerts()}
					>
						{t("allow")}
					</Button>
				) : null}

				<p className="text-muted-foreground text-xs leading-relaxed">
					{t("note")}
				</p>
			</CardContent>
		</Card>
	);
}
