"use client";

import { DEFAULT_PREFERENCES } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Switch } from "@bbrc/ui/components/switch";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ClubDateTime } from "@/components/blocks/club-date-time";
import { PreferencesAppearance } from "@/components/blocks/preferences-appearance";
import {
	PreferenceRow,
	PreferencesSection,
	Segmented,
} from "@/components/blocks/preferences-ui";
import { authClient } from "@/lib/auth-client";
import { clubTimeZone } from "@/lib/club-timezone";
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
	const { accessibility } = usePreferences();

	return (
		<PreferencesSection
			id="accessibility"
			title="Accessibility"
			description="Make the site calmer and easier to read."
		>
			<PreferenceRow
				label="Motion"
				hint="Animations like the like heart and sliding panels."
			>
				<Segmented
					label="Motion"
					value={accessibility.motion}
					options={[
						{ id: "system", label: "Match my device" },
						{ id: "reduce", label: "Reduce" },
						{ id: "full", label: "Full" },
					]}
					onChange={(motion) =>
						updatePreference("accessibility", "motion", motion)
					}
				/>
			</PreferenceRow>
			<SwitchRow
				id="pref-contrast"
				label="High contrast"
				hint="Stronger borders and darker secondary text, in any palette."
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
				label="Easy-reading preset"
				hint="Atkinson Hyperlegible font, larger text and roomier lines."
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
							toast.success("Easy-reading preset applied");
						}}
					>
						Apply preset
					</Button>
				</div>
			</PreferenceRow>
		</PreferencesSection>
	);
}

function ReadingSection() {
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
				toast.error("Could not save that setting.");
			},
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: key });
			},
		}),
	);

	return (
		<PreferencesSection
			id="reading"
			title="Reading"
			description="How reviews, spoilers and reads behave for you."
		>
			<PreferenceRow
				label="Spoilers"
				hint="Reviews, posts and comments marked as spoilers."
			>
				<Segmented
					label="Spoilers"
					value={reading.spoilers}
					options={[
						{ id: "hide", label: "Hide until I tap" },
						{ id: "show", label: "Always show" },
					]}
					onChange={(spoilers) =>
						updatePreference("reading", "spoilers", spoilers)
					}
				/>
			</PreferenceRow>
			<SwitchRow
				id="pref-read-date"
				label="Fill in today's date when I mark a book as read"
				hint={
					signedIn
						? "You can still change the month and year each time."
						: "Sign in to change this one."
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
				toast.error("Could not save that setting.");
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
	const hint = (text: string) =>
		signedIn ? text : "Sign in to change this one.";
	const disabled = !signedIn || preferencesQuery.isPending;

	return (
		<PreferencesSection
			id="reading-privacy"
			title="Wishlist and what I'm reading"
			description="Who can see your wishlist and the books you are reading right now."
		>
			<SwitchRow
				id="pref-wishlist-private"
				label="Keep my wishlist private"
				hint={hint(
					"On: only you can open your wishlist. Others only see how many members want a book, never who. Off: anyone can open it.",
				)}
				checked={current.wishlistPrivate}
				disabled={disabled}
				onChange={(wishlistPrivate) => mutation.mutate({ wishlistPrivate })}
			/>
			<SwitchRow
				id="pref-show-reading"
				label="Show what I'm reading"
				hint={hint(
					"Members can see your current books on your profile and on each book's Reading page. Off: you still count in the totals, without your name.",
				)}
				checked={current.showCurrentlyReading}
				disabled={disabled}
				onChange={(showCurrentlyReading) =>
					mutation.mutate({ showCurrentlyReading })
				}
			/>
			<SwitchRow
				id="pref-show-progress"
				label="Show my reading progress"
				hint={hint(
					"On: others see how far along you are. Off: they only see that you are reading the book.",
				)}
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
				toast.error("Could not save that setting.");
			},
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: key });
			},
		}),
	);

	return (
		<PreferencesSection
			id="shelves"
			title="Shelves"
			description="How other members can work with you on shelves."
		>
			<SwitchRow
				id="pref-shelf-invites"
				label="Allow people to invite me to collaborate on shelves"
				hint={
					signedIn
						? "When this is off, nobody can invite you. Shelves you already collaborate on are not affected."
						: "Sign in to change this one."
				}
				checked={preferenceQuery.data?.allowInvites ?? true}
				disabled={!signedIn || preferenceQuery.isPending}
				onChange={(allowInvites) => mutation.mutate({ allowInvites })}
			/>
		</PreferencesSection>
	);
}

function PollsSection() {
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
				toast.error("Could not save that setting.");
			},
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: key });
			},
		}),
	);

	return (
		<PreferencesSection
			id="polls"
			title="Polls"
			description="How other members can include you in their polls."
		>
			<SwitchRow
				id="pref-poll-options"
				label="Allow people to use me as an option in polls"
				hint={
					signedIn
						? "When this is off, nobody can pick you as a poll option. Polls that already include you stay as they are."
						: "Sign in to change this one."
				}
				checked={preferenceQuery.data?.allowPollOptions ?? true}
				disabled={!signedIn || preferenceQuery.isPending}
				onChange={(allowPollOptions) => mutation.mutate({ allowPollOptions })}
			/>
		</PreferencesSection>
	);
}

function MentionsSection() {
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
				toast.error("Could not save that setting.");
			},
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: key });
			},
		}),
	);

	return (
		<PreferencesSection
			id="mentions"
			title="Mentions"
			description="Whether other members can mention you with @ in posts, comments and reviews."
		>
			<SwitchRow
				id="pref-allow-mentions"
				label="Allow others to mention me"
				hint={
					signedIn
						? "Turn off to stop appearing when people type @. Mentions that already exist stay."
						: "Sign in to change this one."
				}
				checked={preferenceQuery.data?.allowMentions ?? true}
				disabled={!signedIn || preferenceQuery.isPending}
				onChange={(allowMentions) => mutation.mutate({ allowMentions })}
			/>
		</PreferencesSection>
	);
}

function PostsSection() {
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
				toast.error("Could not save that setting.");
			},
			onSettled: () => {
				void queryClient.invalidateQueries({ queryKey: key });
			},
		}),
	);

	return (
		<PreferencesSection
			id="posts"
			title="Posts"
			description="How other members can mention you in their posts."
		>
			<SwitchRow
				id="pref-post-attachment"
				label="Allow people to attach me to their posts"
				hint={
					signedIn
						? "When this is off, nobody can attach your profile to a post. Posts that already include you stay as they are."
						: "Sign in to change this one."
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
				toast.error("Could not save that setting.");
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
	const hint = (text: string) =>
		signedIn ? text : "Sign in to change this one.";

	return (
		<PreferencesSection
			id="sittings"
			title="Sittings"
			description="How organisers can bring you into a sitting."
		>
			<SwitchRow
				id="pref-sitting-auto-add"
				label="Allow organisers to add me to sittings"
				hint={hint(
					"When this is off, organisers cannot add you directly. They can invite you instead, and you choose whether to accept. You can still join on your own.",
				)}
				checked={current.allowAutoAdd}
				disabled={!signedIn || preferenceQuery.isPending}
				onChange={(allowAutoAdd) =>
					mutation.mutate({ ...current, allowAutoAdd })
				}
			/>
			<SwitchRow
				id="pref-sitting-invites"
				label="Allow organisers to invite me to sittings"
				hint={hint(
					"When this is off, organisers cannot send you invitations either. You can still join with an invitation link or the Join button.",
				)}
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
	const { time } = usePreferences();
	const sample = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

	return (
		<PreferencesSection
			id="time"
			title="Time and format"
			description="How deadlines and dates are written."
		>
			<PreferenceRow
				label="Time zone"
				hint={`Deadlines are set in club time (${clubTimeZone}). Choose to see them in your device's time instead.`}
			>
				<Segmented
					label="Time zone"
					value={time.zone}
					options={[
						{ id: "club", label: "Club time" },
						{ id: "device", label: "My device's time" },
					]}
					onChange={(zone) => updatePreference("time", "zone", zone)}
				/>
			</PreferenceRow>
			<PreferenceRow label="Clock">
				<Segmented
					label="Clock"
					value={time.clock}
					options={[
						{ id: "auto", label: "Match my device" },
						{ id: "12h", label: "12-hour" },
						{ id: "24h", label: "24-hour" },
					]}
					onChange={(clock) => updatePreference("time", "clock", clock)}
				/>
			</PreferenceRow>
			<p className="border border-border bg-muted/20 px-3 py-2 text-sm">
				Example: voting closes <ClubDateTime value={sample} />
			</p>
		</PreferencesSection>
	);
}

function SearchSection() {
	const [recentCount, setRecentCount] = useState(() =>
		typeof window === "undefined" ? 0 : readRecentHits().length,
	);

	return (
		<PreferencesSection
			id="search"
			title="Search"
			description="Search remembers the last few things you opened on this device."
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
						toast.success("Recent searches cleared");
					}}
				>
					Clear recent searches
				</Button>
				<span className="text-muted-foreground text-xs">
					{recentCount === 0
						? "Nothing saved right now."
						: `${recentCount} saved on this device.`}
				</span>
			</div>
		</PreferencesSection>
	);
}

function SyncSection() {
	const { data: session } = authClient.useSession();
	const [deviceOnly, setDeviceOnly] = useDeviceOnly();
	const [confirmReset, setConfirmReset] = useState(false);

	return (
		<PreferencesSection
			id="sync"
			title="Sync and reset"
			description="Your choices are saved on this device straight away."
		>
			<SwitchRow
				id="pref-device-only"
				label="Keep these on this device only"
				hint={
					session?.user
						? deviceOnly
							? "Other devices keep their own settings."
							: "Your settings follow you to every device you sign in on."
						: "Sign in to have your settings follow you to other devices."
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
								toast.success("Preferences reset to the defaults");
							}}
						>
							Yes, reset everything
						</Button>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={() => setConfirmReset(false)}
						>
							Keep my settings
						</Button>
					</>
				) : (
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => setConfirmReset(true)}
					>
						Reset to defaults
					</Button>
				)}
			</div>
		</PreferencesSection>
	);
}

const sections = [
	{ id: "appearance", label: "Appearance" },
	{ id: "accessibility", label: "Accessibility" },
	{ id: "reading", label: "Reading" },
	{ id: "reading-privacy", label: "Wishlist" },
	{ id: "shelves", label: "Shelves" },
	{ id: "polls", label: "Polls" },
	{ id: "mentions", label: "Mentions" },
	{ id: "posts", label: "Posts" },
	{ id: "sittings", label: "Sittings" },
	{ id: "time", label: "Time and format" },
	{ id: "search", label: "Search" },
	{ id: "sync", label: "Sync and reset" },
] as const;

export function PreferencesForm() {
	const { data: session } = authClient.useSession();

	return (
		<div className="flex flex-col gap-6">
			{!session?.user ? (
				<p className="border border-border bg-muted/20 px-4 py-3 text-muted-foreground text-sm">
					You are not signed in, so these settings stay on this device. Sign in
					to keep them everywhere.
				</p>
			) : null}

			<nav
				aria-label="Preference sections"
				className="flex flex-wrap gap-x-4 gap-y-1"
			>
				{sections.map((section) => (
					<a
						key={section.id}
						href={`#${section.id}`}
						className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
					>
						{section.label}
					</a>
				))}
			</nav>

			<PreferencesAppearance />
			<AccessibilitySection />
			<ReadingSection />
			<ReadingPrivacySection />
			<ShelvesSection />
			<PollsSection />
			<MentionsSection />
			<PostsSection />
			<SittingsSection />
			<TimeSection />
			<SearchSection />
			<SyncSection />
		</div>
	);
}
