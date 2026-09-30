"use client";

import type { GetNotificationPreferencesOutput } from "@bbrc/api/modules/notification/notification.schema";
import type { NotificationKind } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
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
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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

function ntfyTopicUrl(baseUrl: string, topic: string): string {
	const base = baseUrl.replace(/\/$/, "");
	return `${base}/${encodeURIComponent(topic)}`;
}

function CopyTopicButton({ url, label }: { url: string; label: string }) {
	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			className="shrink-0"
			onClick={async () => {
				try {
					await navigator.clipboard.writeText(url);
					toast.success(`${label} copied`);
				} catch {
					toast.error("Could not copy to clipboard");
				}
			}}
		>
			Copy topic
		</Button>
	);
}

function TopicRow({
	label,
	description,
	url,
}: {
	label: string;
	description: string;
	url: string;
}) {
	return (
		<div className="flex flex-col gap-2 border bg-muted/30 p-4">
			<div className="min-w-0">
				<p className="font-medium text-sm">{label}</p>
				<p className="mt-1 text-muted-foreground text-sm">{description}</p>
				<p className="mt-2 break-all font-mono text-muted-foreground text-xs">
					{url}
				</p>
			</div>
			<CopyTopicButton url={url} label={label} />
		</div>
	);
}

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

	const { ntfy } = preferencesQuery.data;
	const hasAdminTopic = ntfy.adminTopic != null;

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
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Phone push (ntfy)</CardTitle>
					<CardDescription>
						Push alerts go through{" "}
						<a
							href="https://ntfy.sh"
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-4 hover:underline"
						>
							ntfy.sh
							<ExternalLink className="size-3.5" aria-hidden />
						</a>
						. You set this up once; sitting updates use the same personal
						topic—no new link each sitting.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					<ol className="list-decimal space-y-2 pl-5 text-muted-foreground text-sm">
						<li>
							Install the <strong className="text-foreground">ntfy</strong> app
							on your phone (App Store, Google Play, or F-Droid).
						</li>
						<li>
							Below, turn on <strong className="text-foreground">Phone</strong>{" "}
							for the events you want, then click{" "}
							<strong className="text-foreground">Save preferences</strong>.
						</li>
						<li>
							Copy{" "}
							<strong className="text-foreground">Your personal topic</strong>{" "}
							and subscribe in ntfy: open the app → add subscription → paste the
							topic on your phone.
						</li>
						{hasAdminTopic ? (
							<li>
								Admins: also subscribe to{" "}
								<strong className="text-foreground">Admin alerts</strong> for
								request notifications.
							</li>
						) : null}
					</ol>

					<TopicRow
						label="Your personal topic"
						description="All phone pushes for your account (including sitting polls and finishes) are delivered here. Subscribe once."
						url={ntfy.userTopic}
					/>

					{hasAdminTopic ? (
						<TopicRow
							label="Admin alerts"
							description="Book requests and other admin-only pushes. Subscribe in addition to your personal topic."
							url={ntfy.adminTopic ?? ""}
						/>
					) : null}
				</CardContent>
			</Card>

			<Card className="border-dashed">
				<CardHeader className="pb-2">
					<CardTitle className="text-base">What the toggles mean</CardTitle>
				</CardHeader>
				<CardContent className="text-muted-foreground text-sm">
					<p>
						<strong className="text-foreground">Bell</strong> — show in the
						notification menu on BBRC when you are signed in.
					</p>
					<p className="mt-2">
						<strong className="text-foreground">Phone</strong> — send a push to
						your personal ntfy topic (only if you subscribed in the ntfy app and
						saved Phone as on here).
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
												Phone
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
