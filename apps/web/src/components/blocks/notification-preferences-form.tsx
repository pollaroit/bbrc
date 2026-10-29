"use client";

import type { GetNotificationPreferencesOutput } from "@bbrc/api/modules/notification/notification.schema";
import type { NotificationKind } from "@bbrc/shared";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { Checkbox } from "@bbrc/ui/components/checkbox";
import { Field, FieldGroup, FieldLabel } from "@bbrc/ui/components/field";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PushDevicesCard } from "@/components/blocks/push-devices-card";
import { PwaEngagementSettingsCard } from "@/components/blocks/pwa-engagement-settings-card";
import { orpc, queryClient } from "@/utils/orpc";

const GROUP_ORDER = ["club", "personal", "sitting", "admin"] as const;

const GROUP_HEADINGS: Record<(typeof GROUP_ORDER)[number], string> = {
	club: "Club-wide",
	personal: "About you",
	sitting: "Sittings you join",
	admin: "Admin",
};

const GROUP_DESCRIPTIONS: Record<(typeof GROUP_ORDER)[number], string> = {
	club: "Events that concern the whole reading club.",
	personal: "When someone interacts with your content.",
	sitting: "Polls and reading progress for sittings you participate in.",
	admin: "Moderation and library requests (admins only).",
};

type PreferenceRow = GetNotificationPreferencesOutput["preferences"][number];

function groupPreferences(preferences: PreferenceRow[]) {
	const byGroup = new Map<string, PreferenceRow[]>();
	for (const group of GROUP_ORDER) {
		byGroup.set(group, []);
	}
	for (const pref of preferences) {
		const list = byGroup.get(pref.group) ?? [];
		list.push(pref);
		byGroup.set(pref.group, list);
	}
	return GROUP_ORDER.map((group) => ({
		group,
		items: byGroup.get(group) ?? [],
	})).filter((section) => section.items.length > 0);
}

export function NotificationPreferencesForm() {
	const preferencesQuery = useQuery(
		orpc.notification.getPreferences.queryOptions(),
	);

	const [draft, setDraft] = useState<
		Map<NotificationKind, { inAppEnabled: boolean; pushEnabled: boolean }>
	>(new Map());

	useEffect(() => {
		if (!preferencesQuery.data) {
			return;
		}
		setDraft(
			new Map(
				preferencesQuery.data.preferences.map((pref) => [
					pref.kind,
					{
						inAppEnabled: pref.inAppEnabled,
						pushEnabled: pref.pushEnabled,
					},
				]),
			),
		);
	}, [preferencesQuery.data]);

	const sections = useMemo(
		() =>
			preferencesQuery.data
				? groupPreferences(preferencesQuery.data.preferences)
				: [],
		[preferencesQuery.data],
	);

	const saveMutation = useMutation(
		orpc.notification.updatePreferences.mutationOptions({
			onSuccess: async () => {
				toast.success("Notification preferences saved.");
				await queryClient.invalidateQueries({
					queryKey: orpc.notification.getPreferences.key(),
				});
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (preferencesQuery.isPending) {
		return (
			<p className="text-muted-foreground text-sm">Loading preferences…</p>
		);
	}

	if (preferencesQuery.isError || !preferencesQuery.data) {
		return (
			<p className="text-destructive text-sm">
				Could not load notification preferences.
			</p>
		);
	}

	return (
		<form
			className="flex flex-col gap-8"
			onSubmit={(event) => {
				event.preventDefault();
				const preferences = [...draft.entries()].map(([kind, values]) => ({
					kind,
					inAppEnabled: values.inAppEnabled,
					pushEnabled: values.pushEnabled,
				}));
				saveMutation.mutate({ preferences });
			}}
		>
			<PwaEngagementSettingsCard />

			<PushDevicesCard />

			<Card className="border-dashed">
				<CardHeader className="pb-2">
					<CardTitle className="text-base">What the boxes mean</CardTitle>
				</CardHeader>
				<CardContent className="text-muted-foreground text-sm">
					<p>
						<strong className="text-foreground">Bell</strong>: show it in the
						notification menu on BBRC.
					</p>
					<p className="mt-2">
						<strong className="text-foreground">Push</strong>: also send it to
						the devices you turned push on for above.
					</p>
				</CardContent>
			</Card>

			{sections.map((section) => (
				<Card key={section.group}>
					<CardHeader>
						<CardTitle className="text-base">
							{GROUP_HEADINGS[section.group]}
						</CardTitle>
						<CardDescription>
							{GROUP_DESCRIPTIONS[section.group]}
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						{section.items.map((pref) => {
							const values = draft.get(pref.kind) ?? {
								inAppEnabled: pref.inAppEnabled,
								pushEnabled: pref.pushEnabled,
							};

							return (
								<div
									key={pref.kind}
									className="flex flex-col gap-3 border-border border-b pb-4 last:border-b-0 last:pb-0"
								>
									<p className="font-medium text-sm">{pref.label}</p>
									<FieldGroup className="gap-3">
										<Field orientation="horizontal">
											<Checkbox
												id={`${pref.kind}-in-app`}
												checked={values.inAppEnabled}
												onCheckedChange={(checked) => {
													setDraft((current) => {
														const next = new Map(current);
														next.set(pref.kind, {
															...values,
															inAppEnabled: checked === true,
														});
														return next;
													});
												}}
											/>
											<FieldLabel htmlFor={`${pref.kind}-in-app`}>
												Bell
											</FieldLabel>
										</Field>
										<Field orientation="horizontal">
											<Checkbox
												id={`${pref.kind}-push`}
												checked={values.pushEnabled}
												onCheckedChange={(checked) => {
													setDraft((current) => {
														const next = new Map(current);
														next.set(pref.kind, {
															...values,
															pushEnabled: checked === true,
														});
														return next;
													});
												}}
											/>
											<FieldLabel htmlFor={`${pref.kind}-push`}>
												Push
											</FieldLabel>
										</Field>
									</FieldGroup>
								</div>
							);
						})}
					</CardContent>
				</Card>
			))}

			<LoadingButton type="submit" loading={saveMutation.isPending}>
				Save preferences
			</LoadingButton>
		</form>
	);
}
