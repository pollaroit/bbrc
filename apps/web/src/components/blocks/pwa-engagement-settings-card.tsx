"use client";

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

import {
	readPwaEngagementPreferences,
	writePwaEngagementPreferences,
} from "@/lib/pwa/pwa-engagement-storage";

export function PwaEngagementSettingsCard() {
	const [soundsEnabled, setSoundsEnabled] = useState(false);

	useEffect(() => {
		setSoundsEnabled(readPwaEngagementPreferences().soundsEnabled);
	}, []);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Sound</CardTitle>
				<CardDescription>
					While BBRC is open, a new notification shows a message at the top of
					the page. You can add a short sound. This is saved on this device
					only.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Field orientation="horizontal">
					<Checkbox
						id="pwa-sounds"
						checked={soundsEnabled}
						onCheckedChange={(checked) => {
							const next = checked === true;
							writePwaEngagementPreferences({ soundsEnabled: next });
							setSoundsEnabled(next);
						}}
					/>
					<FieldLabel htmlFor="pwa-sounds">
						Play a short sound for new notifications
					</FieldLabel>
				</Field>
			</CardContent>
		</Card>
	);
}
