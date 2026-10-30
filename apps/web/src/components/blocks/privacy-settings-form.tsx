"use client";

import type { PrivacySettings } from "@bbrc/api/modules/privacy/privacy.schema";
import {
	VISIBILITY_LABELS,
	VISIBILITY_LEVELS,
	type Visibility,
} from "@bbrc/shared";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { Switch } from "@bbrc/ui/components/switch";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { PreferencesSection } from "@/components/blocks/preferences-ui";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import { orpc, queryClient } from "@/utils/orpc";

const LEVEL_OPTIONS = VISIBILITY_LEVELS.map((level) => ({
	id: level,
	label: VISIBILITY_LABELS[level],
}));

type SectionKey = keyof PrivacySettings["sections"];
type DetailKey = keyof PrivacySettings["details"];

const SECTION_ROWS: { key: SectionKey; label: string; hint: string }[] = [
	{
		key: "reads",
		label: "Books I have read",
		hint: "Your read list, dates and ratings on your profile.",
	},
	{
		key: "reviews",
		label: "My reviews",
		hint: "Hidden reviews still count in a book's rating and review count.",
	},
	{
		key: "favorites",
		label: "My favourites",
		hint: "The four books you pinned.",
	},
	{
		key: "goals",
		label: "My goals",
		hint: "Your reading goals and what counts towards them.",
	},
	{
		key: "reading",
		label: "What I'm reading now",
		hint: "On each book's readers list and your profile. Hidden, you still count in the totals.",
	},
	{
		key: "wishlist",
		label: "My wishlist",
		hint: "Book pages only ever show how many members want a book, never who.",
	},
];

const DETAIL_ROWS: { key: DetailKey; label: string }[] = [
	{ key: "dateOfBirth", label: "Date of birth" },
	{ key: "gender", label: "Gender" },
	{ key: "location", label: "Location" },
];

function Row({
	label,
	hint,
	children,
}: {
	label: string;
	hint?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
			<div className="space-y-0.5">
				<p className="font-medium text-sm">{label}</p>
				{hint ? (
					<p className="text-muted-foreground text-xs leading-relaxed">
						{hint}
					</p>
				) : null}
			</div>
			<div className="shrink-0">{children}</div>
		</div>
	);
}

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

/** Who can see what: profile level, the sections, the personal details. */
export function PrivacySettingsForm() {
	const query = useQuery(orpc.privacy.get.queryOptions());
	const key = orpc.privacy.get.queryKey();

	const mutation = useMutation(
		orpc.privacy.update.mutationOptions({
			onMutate: async (input) => {
				await queryClient.cancelQueries({ queryKey: key });
				const previous = queryClient.getQueryData<PrivacySettings>(key);
				if (previous) {
					const profileVisibility =
						input.profileVisibility ?? previous.profileVisibility;
					queryClient.setQueryData<PrivacySettings>(key, {
						...previous,
						profileVisibility,
						autoAcceptFriends:
							profileVisibility === "private"
								? false
								: (input.autoAcceptFriends ?? previous.autoAcceptFriends),
						showReadingProgress:
							input.showReadingProgress ?? previous.showReadingProgress,
						sections: { ...previous.sections, ...input.sections },
						details: { ...previous.details, ...input.details },
						defaults: { ...previous.defaults, ...input.defaults },
					});
				}
				return { previous };
			},
			onError: (error, _input, context) => {
				if (context?.previous) queryClient.setQueryData(key, context.previous);
				toast.error(error.message);
			},
			onSuccess: (saved) => queryClient.setQueryData(key, saved),
		}),
	);

	if (query.isPending) {
		return (
			<div className="flex flex-col gap-6" aria-hidden>
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-64 w-full" />
			</div>
		);
	}
	if (query.isError || !query.data) {
		return (
			<p className="text-destructive text-sm">
				Could not load your privacy settings.
			</p>
		);
	}
	const settings = query.data;
	const isPrivate = settings.profileVisibility === "private";

	return (
		<div className="flex flex-col gap-8">
			<PreferencesSection
				id="profile-privacy"
				title="Your profile"
				description="A private profile shows only your name, username, photo, bio and how many friends you have. Everything else is for friends."
			>
				<SwitchRow
					id="privacy-private"
					label="Private profile"
					hint="Non-friends, signed in or not, see the closed version of your profile. You stay searchable and mentionable, with a lock."
					checked={isPrivate}
					onChange={(checked) =>
						mutation.mutate({
							profileVisibility: checked ? "private" : "public",
						})
					}
				/>
				<SwitchRow
					id="privacy-auto-accept"
					label="Accept friend requests automatically"
					hint={
						isPrivate
							? "Not available while your profile is private."
							: "Anyone who asks becomes your friend at once. Off, you accept or decline each request."
					}
					checked={settings.autoAcceptFriends}
					disabled={isPrivate}
					onChange={(autoAcceptFriends) =>
						mutation.mutate({ autoAcceptFriends })
					}
				/>
			</PreferencesSection>

			<PreferencesSection
				id="section-privacy"
				title="Who can see what"
				description="These are never wider than your profile: with a private profile, “Everyone” still means friends only."
			>
				{SECTION_ROWS.map((row) => (
					<Row key={row.key} label={row.label} hint={row.hint}>
						<SegmentedControl<Visibility>
							label={row.label}
							value={settings.sections[row.key]}
							options={LEVEL_OPTIONS}
							onChange={(level) =>
								mutation.mutate({ sections: { [row.key]: level } })
							}
						/>
					</Row>
				))}
				<SwitchRow
					id="privacy-progress"
					label="Show my page and percent"
					hint="Whoever may see what you are reading also sees how far along you are. Off, they only see that you are reading it."
					checked={settings.showReadingProgress}
					onChange={(showReadingProgress) =>
						mutation.mutate({ showReadingProgress })
					}
				/>
			</PreferencesSection>

			<PreferencesSection
				id="defaults-privacy"
				title="New things start as"
				description="Who can see a new post or shelf until you choose otherwise. You can change it on each one."
			>
				<Row label="New posts">
					<SegmentedControl<Visibility>
						label="New posts"
						value={settings.defaults.post}
						options={LEVEL_OPTIONS}
						onChange={(level) => mutation.mutate({ defaults: { post: level } })}
					/>
				</Row>
				<Row label="New shelves">
					<SegmentedControl<Visibility>
						label="New shelves"
						value={settings.defaults.shelf}
						options={LEVEL_OPTIONS}
						onChange={(level) =>
							mutation.mutate({ defaults: { shelf: level } })
						}
					/>
				</Row>
			</PreferencesSection>

			<PreferencesSection
				id="details-privacy"
				title="Personal details"
				description="Your photo, name, username and bio are always public. Website, links, favourite genres and reading speed follow your profile."
			>
				{DETAIL_ROWS.map((row) => (
					<Row key={row.key} label={row.label}>
						<SegmentedControl<Visibility>
							label={row.label}
							value={settings.details[row.key]}
							options={LEVEL_OPTIONS}
							onChange={(level) =>
								mutation.mutate({ details: { [row.key]: level } })
							}
						/>
					</Row>
				))}
			</PreferencesSection>

			<div className="flex gap-3 border border-border border-dashed p-4 text-muted-foreground text-sm leading-relaxed">
				<Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
				<div className="space-y-2">
					<p>
						<strong className="text-foreground">What stays visible.</strong>{" "}
						Comments and likes you leave on someone else's public post are
						public, with your name and photo. Sittings are club activity, so
						people in a sitting always see each other.
					</p>
					<p>
						Counts, averages and rankings always include everyone, whatever they
						hide. Only names are left out.
					</p>
				</div>
			</div>
		</div>
	);
}
