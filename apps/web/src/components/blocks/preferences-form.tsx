"use client";

import { DEFAULT_PREFERENCES } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Switch } from "@bbrc/ui/components/switch";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClubDateTime } from "@/components/blocks/club-date-time";
import { LanguagePicker } from "@/components/blocks/language-picker";
import { PreferencesAppearance } from "@/components/blocks/preferences-appearance";
import {
	PreferenceRow,
	PreferencesSection,
	Segmented,
} from "@/components/blocks/preferences-ui";
import { RatingDefinitionsSection } from "@/components/blocks/rating-definitions-editor";
import { authClient } from "@/lib/auth-client";
import { clubTimeZone } from "@/lib/club-timezone";
import { isLanguageSwitchEnabled } from "@/lib/i18n/language-switch";
import {
	getPreferencesSnapshot,
	writePreferences,
} from "@/lib/preferences/store";
import {
	updatePreference,
	useDeviceOnly,
	usePreferences,
} from "@/lib/preferences/use-preferences";
import { clearRecentHits, readRecentHits } from "@/lib/search/recents";
import { orpc, queryClient } from "@/utils/orpc";

function SwitchRow({
	id,
	label,
	hint,
	checked,
	disabled,
	onChange,
}: {
	id: string;
	label: string;
	hint: string;
	checked: boolean;
	disabled?: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<div className="flex items-start justify-between gap-4">
			<div className="space-y-0.5">
				<label htmlFor={id} className="font-medium text-sm">
					{label}
				</label>
				<p className="text-muted-foreground text-xs leading-relaxed">{hint}</p>
			</div>
			<Switch
				id={id}
				checked={checked}
				disabled={disabled}
				onCheckedChange={onChange}
			/>
		</div>
	);
}

function AccessibilitySection() {
	const t = useTranslations("preferences");
	const { accessibility } = usePreferences();

	return (
		<PreferencesSection
			id="accessibility"
			title={t("accessibility.title")}
			description={t("accessibility.description")}
		>
			<PreferenceRow
				label={t("accessibility.motion")}
				hint={t("accessibility.motionHint")}
			>
				<Segmented
					label={t("accessibility.motion")}
					value={accessibility.motion}
					options={[
						{ id: "system", label: t("accessibility.motionSystem") },
						{ id: "reduce", label: t("accessibility.motionReduce") },
						{ id: "full", label: t("accessibility.motionFull") },
					]}
					onChange={(motion) =>
						updatePreference("accessibility", "motion", motion)
					}
				/>
			</PreferenceRow>
			<SwitchRow
				id="pref-contrast"
				label={t("accessibility.contrast")}
				hint={t("accessibility.contrastHint")}
				checked={accessibility.contrast === "high"}
				onChange={(checked) =>
					updatePreference(
						"accessibility",
						"contrast",
						checked ? "high" : "normal",
					)
				}
			/>
			<PreferenceRow
				label={t("accessibility.easyReading")}
				hint={t("accessibility.easyReadingHint")}
			>
				<div>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => {
							const current = getPreferencesSnapshot();
							writePreferences({
								...current,
								appearance: {
									...current.appearance,
									fontBody: "atkinson",
									fontReading: "body",
									textSize: "lg",
									lineSpacing: "relaxed",
								},
							});
							toast.success(t("accessibility.easyReadingApplied"));
						}}
					>
						{t("accessibility.applyPreset")}
					</Button>
				</div>
			</PreferenceRow>
		</PreferencesSection>
	);
}

function ReadingSection() {
	const t = useTranslations("preferences");
	const { reading } = usePreferences();
	const { data: session } = authClient.useSession();
	const signedIn = Boolean(session?.user);

	const preferencesQuery = useQuery({
		...orpc.read.getReadPreferences.queryOptions(),
		enabled: signedIn,
	});
	const key = orpc.read.getReadPreferences.queryKey();
	const mutation = useMutation(
		orpc.read.setReadPreferences.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: key });
				const previous = queryClient.getQueryData(key);
				queryClient.setQueryData(key, variables);
				return { previous };
			},
			onError: (_error, _variables, context) => {
				queryClient.setQueryData(key, context?.previous);
				toast.error(t("common.saveFailed"));
			},
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: key });
			},
		}),
	);

	return (
		<PreferencesSection
			id="reading"
			title={t("reading.title")}
			description={t("reading.description")}
		>
			<PreferenceRow
				label={t("reading.spoilers")}
				hint={t("reading.spoilersHint")}
			>
				<Segmented
					label={t("reading.spoilers")}
					value={reading.spoilers}
					options={[
						{ id: "hide", label: t("reading.spoilersHide") },
						{ id: "show", label: t("reading.spoilersShow") },
					]}
					onChange={(spoilers) =>
						updatePreference("reading", "spoilers", spoilers)
					}
				/>
			</PreferenceRow>
			<SwitchRow
				id="pref-read-date"
				label={t("reading.defaultDate")}
				hint={
					signedIn ? t("reading.defaultDateHint") : t("common.signInToChange")
				}
				checked={preferencesQuery.data?.defaultToCurrentDate ?? true}
				disabled={!signedIn || preferencesQuery.isPending}
				onChange={(defaultToCurrentDate) =>
					mutation.mutate({ defaultToCurrentDate })
				}
			/>
		</PreferencesSection>
	);
}

function ReadingPrivacySection() {
	const t = useTranslations("preferences");
	const { data: session } = authClient.useSession();
	const signedIn = Boolean(session?.user);

	const preferencesQuery = useQuery({
		...orpc.reading.preferences.queryOptions(),
		enabled: signedIn,
	});
	const key = orpc.reading.preferences.queryKey();
	const mutation = useMutation(
		orpc.reading.setPreferences.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: key });
				const previous = queryClient.getQueryData(key);
				if (previous)
					queryClient.setQueryData(key, { ...previous, ...variables });
				return { previous };
			},
			onError: (_error, _variables, context) => {
				queryClient.setQueryData(key, context?.previous);
				toast.error(t("common.saveFailed"));
			},
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: key });
				void queryClient.invalidateQueries({
					queryKey: orpc.shelf.getBySlug.key(),
				});
			},
		}),
	);
	const current = {
		wishlistPrivate: preferencesQuery.data?.wishlistPrivate ?? true,
		showCurrentlyReading: preferencesQuery.data?.showCurrentlyReading ?? true,
		showReadingProgress: preferencesQuery.data?.showReadingProgress ?? true,
	};
	const hint = (text: string) => (signedIn ? text : t("common.signInToChange"));
	const disabled = !signedIn || preferencesQuery.isPending;

	return (
		<PreferencesSection
			id="reading-privacy"
			title={t("privacy.title")}
			description={t("privacy.description")}
		>
			<SwitchRow
				id="pref-wishlist-private"
				label={t("privacy.wishlistPrivate")}
				hint={hint(t("privacy.wishlistPrivateHint"))}
				checked={current.wishlistPrivate}
				disabled={disabled}
				onChange={(wishlistPrivate) => mutation.mutate({ wishlistPrivate })}
			/>
			<SwitchRow
				id="pref-show-reading"
				label={t("privacy.showReading")}
				hint={hint(t("privacy.showReadingHint"))}
				checked={current.showCurrentlyReading}
				disabled={disabled}
				onChange={(showCurrentlyReading) =>
					mutation.mutate({ showCurrentlyReading })
				}
			/>
			<SwitchRow
				id="pref-show-progress"
				label={t("privacy.showProgress")}
				hint={hint(t("privacy.showProgressHint"))}
				checked={current.showReadingProgress}
				disabled={disabled}
				onChange={(showReadingProgress) =>
					mutation.mutate({ showReadingProgress })
				}
			/>
		</PreferencesSection>
	);
}

function ShelvesSection() {
	const t = useTranslations("preferences");
	const { data: session } = authClient.useSession();
	const signedIn = Boolean(session?.user);

	const preferenceQuery = useQuery({
		...orpc.shelf.collab.getInvitePreference.queryOptions(),
		enabled: signedIn,
	});
	const key = orpc.shelf.collab.getInvitePreference.queryKey();
	const mutation = useMutation(
		orpc.shelf.collab.setInvitePreference.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: key });
				const previous = queryClient.getQueryData(key);
				queryClient.setQueryData(key, variables);
				return { previous };
			},
			onError: (_error, _variables, context) => {
				queryClient.setQueryData(key, context?.previous);
				toast.error(t("common.saveFailed"));
			},
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: key });
			},
		}),
	);

	return (
		<PreferencesSection
			id="shelves"
			title={t("shelves.title")}
			description={t("shelves.description")}
		>
			<SwitchRow
				id="pref-shelf-invites"
				label={t("shelves.allowInvites")}
				hint={
					signedIn ? t("shelves.allowInvitesHint") : t("common.signInToChange")
				}
				checked={preferenceQuery.data?.allowInvites ?? true}
				disabled={!signedIn || preferenceQuery.isPending}
				onChange={(allowInvites) => mutation.mutate({ allowInvites })}
			/>
		</PreferencesSection>
	);
}

function PollsSection() {
	const t = useTranslations("preferences");
	const { data: session } = authClient.useSession();
	const signedIn = Boolean(session?.user);

	const preferenceQuery = useQuery({
		...orpc.postPoll.getPreference.queryOptions(),
		enabled: signedIn,
	});
	const key = orpc.postPoll.getPreference.queryKey();
	const mutation = useMutation(
		orpc.postPoll.setPreference.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: key });
				const previous = queryClient.getQueryData(key);
				queryClient.setQueryData(key, variables);
				return { previous };
			},
			onError: (_error, _variables, context) => {
				queryClient.setQueryData(key, context?.previous);
				toast.error(t("common.saveFailed"));
			},
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: key });
			},
		}),
	);

	return (
		<PreferencesSection
			id="polls"
			title={t("polls.title")}
			description={t("polls.description")}
		>
			<SwitchRow
				id="pref-poll-options"
				label={t("polls.allowOption")}
				hint={
					signedIn ? t("polls.allowOptionHint") : t("common.signInToChange")
				}
				checked={preferenceQuery.data?.allowPollOptions ?? true}
				disabled={!signedIn || preferenceQuery.isPending}
				onChange={(allowPollOptions) => mutation.mutate({ allowPollOptions })}
			/>
		</PreferencesSection>
	);
}

function MentionsSection() {
	const t = useTranslations("preferences");
	const { data: session } = authClient.useSession();
	const signedIn = Boolean(session?.user);

	const preferenceQuery = useQuery({
		...orpc.mention.preferences.queryOptions(),
		enabled: signedIn,
	});
	const key = orpc.mention.preferences.queryKey();
	const mutation = useMutation(
		orpc.mention.setPreferences.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: key });
				const previous = queryClient.getQueryData(key);
				queryClient.setQueryData(key, variables);
				return { previous };
			},
			onError: (_error, _variables, context) => {
				queryClient.setQueryData(key, context?.previous);
				toast.error(t("common.saveFailed"));
			},
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: key });
			},
		}),
	);

	return (
		<PreferencesSection
			id="mentions"
			title={t("mentions.title")}
			description={t("mentions.description")}
		>
			<SwitchRow
				id="pref-allow-mentions"
				label={t("mentions.allow")}
				hint={signedIn ? t("mentions.allowHint") : t("common.signInToChange")}
				checked={preferenceQuery.data?.allowMentions ?? true}
				disabled={!signedIn || preferenceQuery.isPending}
				onChange={(allowMentions) => mutation.mutate({ allowMentions })}
			/>
		</PreferencesSection>
	);
}

function CompareSection() {
	const t = useTranslations("preferences");
	const { data: session } = authClient.useSession();
	const signedIn = Boolean(session?.user);

	const preferenceQuery = useQuery({
		...orpc.userCompare.getPreferences.queryOptions(),
		enabled: signedIn,
	});
	const key = orpc.userCompare.getPreferences.queryKey();
	const mutation = useMutation(
		orpc.userCompare.setPreferences.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: key });
				const previous = queryClient.getQueryData(key);
				queryClient.setQueryData(key, variables);
				return { previous };
			},
			onError: (_error, _variables, context) => {
				queryClient.setQueryData(key, context?.previous);
				toast.error(t("common.saveFailed"));
			},
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: key });
			},
		}),
	);

	return (
		<PreferencesSection
			id="compare"
			title={t("compare.title")}
			description={t("compare.description")}
		>
			<SwitchRow
				id="pref-allow-compare"
				label={t("compare.allow")}
				hint={signedIn ? t("compare.allowHint") : t("common.signInToChange")}
				checked={preferenceQuery.data?.allowCompare ?? true}
				disabled={!signedIn || preferenceQuery.isPending}
				onChange={(allowCompare) => mutation.mutate({ allowCompare })}
			/>
		</PreferencesSection>
	);
}

function PostsSection() {
	const t = useTranslations("preferences");
	const { data: session } = authClient.useSession();
	const signedIn = Boolean(session?.user);

	const preferenceQuery = useQuery({
		...orpc.post.getAttachmentPreference.queryOptions(),
		enabled: signedIn,
	});
	const key = orpc.post.getAttachmentPreference.queryKey();
	const mutation = useMutation(
		orpc.post.setAttachmentPreference.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: key });
				const previous = queryClient.getQueryData(key);
				queryClient.setQueryData(key, variables);
				return { previous };
			},
			onError: (_error, _variables, context) => {
				queryClient.setQueryData(key, context?.previous);
				toast.error(t("common.saveFailed"));
			},
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: key });
			},
		}),
	);

	return (
		<PreferencesSection
			id="posts"
			title={t("posts.title")}
			description={t("posts.description")}
		>
			<SwitchRow
				id="pref-post-attachment"
				label={t("posts.allowAttach")}
				hint={
					signedIn ? t("posts.allowAttachHint") : t("common.signInToChange")
				}
				checked={preferenceQuery.data?.allowPostAttachment ?? true}
				disabled={!signedIn || preferenceQuery.isPending}
				onChange={(allowPostAttachment) =>
					mutation.mutate({ allowPostAttachment })
				}
			/>
		</PreferencesSection>
	);
}

function SittingsSection() {
	const t = useTranslations("preferences");
	const { data: session } = authClient.useSession();
	const signedIn = Boolean(session?.user);

	const preferenceQuery = useQuery({
		...orpc.sitting.join.preferences.get.queryOptions(),
		enabled: signedIn,
	});
	const key = orpc.sitting.join.preferences.get.queryKey();
	const mutation = useMutation(
		orpc.sitting.join.preferences.set.mutationOptions({
			onMutate: async (variables) => {
				await queryClient.cancelQueries({ queryKey: key });
				const previous = queryClient.getQueryData(key);
				queryClient.setQueryData(key, variables);
				return { previous };
			},
			onError: (_error, _variables, context) => {
				queryClient.setQueryData(key, context?.previous);
				toast.error(t("common.saveFailed"));
			},
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: key });
			},
		}),
	);
	const current = {
		allowAutoAdd: preferenceQuery.data?.allowAutoAdd ?? true,
		allowInvites: preferenceQuery.data?.allowInvites ?? true,
	};
	const hint = (text: string) => (signedIn ? text : t("common.signInToChange"));

	return (
		<PreferencesSection
			id="sittings"
			title={t("sittings.title")}
			description={t("sittings.description")}
		>
			<SwitchRow
				id="pref-sitting-auto-add"
				label={t("sittings.allowAutoAdd")}
				hint={hint(t("sittings.allowAutoAddHint"))}
				checked={current.allowAutoAdd}
				disabled={!signedIn || preferenceQuery.isPending}
				onChange={(allowAutoAdd) =>
					mutation.mutate({ ...current, allowAutoAdd })
				}
			/>
			<SwitchRow
				id="pref-sitting-invites"
				label={t("sittings.allowInvites")}
				hint={hint(t("sittings.allowInvitesHint"))}
				checked={current.allowInvites}
				disabled={!signedIn || preferenceQuery.isPending}
				onChange={(allowInvites) =>
					mutation.mutate({ ...current, allowInvites })
				}
			/>
		</PreferencesSection>
	);
}

function TimeSection() {
	const t = useTranslations("preferences");
	const { time } = usePreferences();
	const sample = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

	return (
		<PreferencesSection
			id="time"
			title={t("time.title")}
			description={t("time.description")}
		>
			<PreferenceRow
				label={t("time.zone")}
				hint={t("time.zoneHint", { zone: clubTimeZone })}
			>
				<Segmented
					label={t("time.zone")}
					value={time.zone}
					options={[
						{ id: "club", label: t("time.zoneClub") },
						{ id: "device", label: t("time.zoneDevice") },
					]}
					onChange={(zone) => updatePreference("time", "zone", zone)}
				/>
			</PreferenceRow>
			<PreferenceRow label={t("time.clock")}>
				<Segmented
					label={t("time.clock")}
					value={time.clock}
					options={[
						{ id: "auto", label: t("time.clockAuto") },
						{ id: "12h", label: t("time.clock12") },
						{ id: "24h", label: t("time.clock24") },
					]}
					onChange={(clock) => updatePreference("time", "clock", clock)}
				/>
			</PreferenceRow>
			<p className="border border-border bg-muted/20 px-3 py-2 text-sm">
				{t.rich("time.example", {
					date: () => <ClubDateTime value={sample} />,
				})}
			</p>
		</PreferencesSection>
	);
}

function LanguageSection() {
	const t = useTranslations("language");
	if (!isLanguageSwitchEnabled()) return null;
	return (
		<PreferencesSection
			id="language"
			title={t("title")}
			description={t("description")}
		>
			<LanguagePicker />
		</PreferencesSection>
	);
}

function SearchSection() {
	const t = useTranslations("preferences");
	// The saved list lives in this browser, so it is read after hydration (reading it during
	// render gives the server and the first client render different text).
	const [recentCount, setRecentCount] = useState(0);
	useEffect(() => {
		setRecentCount(readRecentHits().length);
	}, []);

	return (
		<PreferencesSection
			id="search"
			title={t("search.title")}
			description={t("search.description")}
		>
			<div className="flex flex-wrap items-center gap-3">
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={recentCount === 0}
					onClick={() => {
						clearRecentHits();
						setRecentCount(0);
						toast.success(t("search.cleared"));
					}}
				>
					{t("search.clear")}
				</Button>
				<span className="text-muted-foreground text-xs">
					{recentCount === 0
						? t("search.none")
						: t("search.saved", { count: recentCount })}
				</span>
			</div>
		</PreferencesSection>
	);
}

function SyncSection() {
	const t = useTranslations("preferences");
	const { data: session } = authClient.useSession();
	const [deviceOnly, setDeviceOnly] = useDeviceOnly();
	const [confirmReset, setConfirmReset] = useState(false);

	return (
		<PreferencesSection
			id="sync"
			title={t("sync.title")}
			description={t("sync.description")}
		>
			<SwitchRow
				id="pref-device-only"
				label={t("sync.deviceOnly")}
				hint={
					session?.user
						? deviceOnly
							? t("sync.deviceOnlyOn")
							: t("sync.deviceOnlyOff")
						: t("sync.deviceOnlySignedOut")
				}
				checked={deviceOnly}
				disabled={!session?.user}
				onChange={setDeviceOnly}
			/>
			<div className="flex flex-wrap items-center gap-2">
				{confirmReset ? (
					<>
						<Button
							type="button"
							size="sm"
							variant="destructive"
							onClick={() => {
								writePreferences(DEFAULT_PREFERENCES);
								setConfirmReset(false);
								toast.success(t("sync.resetDone"));
							}}
						>
							{t("sync.confirmReset")}
						</Button>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={() => setConfirmReset(false)}
						>
							{t("sync.keep")}
						</Button>
					</>
				) : (
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => setConfirmReset(true)}
					>
						{t("sync.reset")}
					</Button>
				)}
			</div>
		</PreferencesSection>
	);
}

const sections = [
	{ id: "appearance" },
	{ id: "language" },
	{ id: "accessibility" },
	{ id: "reading" },
	{ id: "reading-privacy" },
	{ id: "ratings" },
	{ id: "shelves" },
	{ id: "polls" },
	{ id: "mentions" },
	{ id: "compare" },
	{ id: "posts" },
	{ id: "sittings" },
	{ id: "time" },
	{ id: "search" },
	{ id: "sync" },
] as const;

export function PreferencesForm() {
	const t = useTranslations("preferences");
	const { data: session } = authClient.useSession();

	return (
		<div className="flex flex-col gap-6">
			{!session?.user ? (
				<p className="border border-border bg-muted/20 px-4 py-3 text-muted-foreground text-sm">
					{t("signedOutNotice")}
				</p>
			) : null}

			<nav
				aria-label={t("sectionsLabel")}
				className="flex flex-wrap gap-x-4 gap-y-1"
			>
				{sections
					.filter(
						(section) => section.id !== "language" || isLanguageSwitchEnabled(),
					)
					.map((section) => (
						<a
							key={section.id}
							href={`#${section.id}`}
							className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
						>
							{t(`sections.${section.id}`)}
						</a>
					))}
			</nav>

			<PreferencesAppearance />
			<LanguageSection />
			<AccessibilitySection />
			<ReadingSection />
			<ReadingPrivacySection />
			<RatingDefinitionsSection />
			<ShelvesSection />
			<PollsSection />
			<MentionsSection />
			<CompareSection />
			<PostsSection />
			<SittingsSection />
			<TimeSection />
			<SearchSection />
			<SyncSection />
		</div>
	);
}
