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
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PwaEngagementSettingsCard } from "@/components/blocks/pwa-engagement-settings-card";
import { orpc, queryClient } from "@/utils/orpc";

const GROUP_ORDER = ["club", "personal", "sitting", "admin"] as const;

/** Bold text inside a message: `<b>Phone</b>`. */
const b = (chunks: React.ReactNode) => (
	<strong className="text-foreground">{chunks}</strong>
);

function CopyTopicButton({ url, label }: { url: string; label: string }) {
	const t = useTranslations("settings.notificationsForm");
	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			className="shrink-0"
			onClick={async () => {
				try {
					await navigator.clipboard.writeText(url);
					toast.success(t("copied", { label }));
				} catch {
					toast.error(t("copyFailed"));
				}
			}}
		>
			{t("copyTopic")}
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
	const t = useTranslations("notifications");
	const tf = useTranslations("settings.notificationsForm");
	const preferencesQuery = useQuery(
		orpc.notification.getPreferences.queryOptions(),
	);

	const [draft, setDraft] = useState<
		Map<NotificationKind, { inAppEnabled: boolean; pushEnabled: boolean }>
	>(new Map());
	const [telegramReadingReminder, setTelegramReadingReminder] = useState(true);

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
		setTelegramReadingReminder(
			preferencesQuery.data.telegram.sittingReadingReminderEnabled,
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
				toast.success(tf("saved"));
				await queryClient.invalidateQueries({
					queryKey: orpc.notification.getPreferences.key(),
				});
			},
			onError: (error) => toast.error(error.message),
		}),
	);

	if (preferencesQuery.isPending) {
		return <p className="text-muted-foreground text-sm">{tf("loading")}</p>;
	}

	if (preferencesQuery.isError || !preferencesQuery.data) {
		return <p className="text-destructive text-sm">{tf("loadFailed")}</p>;
	}

	const { ntfy, telegram } = preferencesQuery.data;
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
				saveMutation.mutate({
					preferences,
					telegramSittingReadingReminderEnabled: telegramReadingReminder,
				});
			}}
		>
			<PwaEngagementSettingsCard />

			{telegram.linked ? (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Telegram DM</CardTitle>
						<CardDescription>
							Private messages from the BBRC bot while a sitting is in the
							reading phase (not the club group).
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<p className="text-muted-foreground text-sm leading-relaxed">
							Each day at <strong className="text-foreground">14:00</strong>{" "}
							club time, if you are still reading or have not started, the bot
							sends a short reminder with the deadline, how many members have
							finished, and a suggested daily page count when we know the book
							length. Use the buttons in the message to update your progress.
						</p>
						<Field orientation="horizontal">
							<Checkbox
								id="telegram-reading-reminder"
								checked={telegramReadingReminder}
								onCheckedChange={(checked) => {
									setTelegramReadingReminder(checked === true);
								}}
							/>
							<FieldLabel htmlFor="telegram-reading-reminder">
								Daily reading reminders
							</FieldLabel>
						</Field>
					</CardContent>
				</Card>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle className="text-base">{tf("ntfyTitle")}</CardTitle>
					<CardDescription>
						{tf.rich("ntfyDescription", {
							link: (chunks) => (
								<a
									href="https://ntfy.sh"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-4 hover:underline"
								>
									{chunks}
									<ExternalLink className="size-3.5" aria-hidden />
								</a>
							),
						})}
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					<ol className="list-decimal space-y-2 pl-5 text-muted-foreground text-sm">
						<li>{tf.rich("stepInstall", { b })}</li>
						<li>{tf.rich("stepTurnOn", { b })}</li>
						<li>{tf.rich("stepSubscribe", { b })}</li>
						{hasAdminTopic ? <li>{tf.rich("stepAdmin", { b })}</li> : null}
					</ol>

					<TopicRow
						label={tf("personalTopic")}
						description={tf("personalTopicHelp")}
						url={ntfy.userTopic}
					/>

					{hasAdminTopic ? (
						<TopicRow
							label={tf("adminTopic")}
							description={tf("adminTopicHelp")}
							url={ntfy.adminTopic ?? ""}
						/>
					) : null}
				</CardContent>
			</Card>

			<Card className="border-dashed">
				<CardHeader className="pb-2">
					<CardTitle className="text-base">{tf("togglesTitle")}</CardTitle>
				</CardHeader>
				<CardContent className="text-muted-foreground text-sm">
					<p>{tf.rich("toggleBell", { b })}</p>
					<p className="mt-2">{tf.rich("togglePhone", { b })}</p>
				</CardContent>
			</Card>

			{sections.map((section) => (
				<Card key={section.group}>
					<CardHeader>
						<CardTitle className="text-base">
							{t(`groups.${section.group}`)}
						</CardTitle>
						<CardDescription>
							{t(`groupDescriptions.${section.group}`)}
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
									<p className="font-medium text-sm">
										{t(`kinds.${pref.kind}`)}
									</p>
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
												{tf("bell")}
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
												{tf("phone")}
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
				{tf("save")}
			</LoadingButton>
		</form>
	);
}
