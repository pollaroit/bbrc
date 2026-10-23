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
			<TimeSection />
			<SearchSection />
			<SyncSection />
		</div>
	);
}
