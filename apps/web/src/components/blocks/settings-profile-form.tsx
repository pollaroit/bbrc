"use client";

import {
	contentPlainText,
	getBirthDateBounds,
	MAX_USER_AGE,
	MIN_USER_AGE,
	PROFILE_BIO_MAX_PLAIN_CHARS,
	PROFILE_LOCATION_MAX_CHARS,
	PROFILE_WEBSITE_MAX_CHARS,
	type SocialSiteSlug,
	socialSites,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
	FieldTitle,
} from "@bbrc/ui/components/field";
import { Input } from "@bbrc/ui/components/input";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@bbrc/ui/components/popover";
import { RadioGroup, RadioGroupItem } from "@bbrc/ui/components/radio-group";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { toast } from "sonner";
import { ProfileBirthDatePicker } from "@/components/blocks/profile-birth-date-picker";
import { ProfileGenrePicker } from "@/components/blocks/profile-genre-picker";
import {
	ProfileSocialLinksField,
	type SocialLinkDraft,
} from "@/components/blocks/profile-social-links-field";
import { ProfileWpmDialog } from "@/components/blocks/profile-wpm-dialog";
import { RichContentView } from "@/components/blocks/rich-content-view";
import { RichTextEditor } from "@/components/blocks/rich-text-editor";
import { useFormatters } from "@/lib/i18n/use-formatters";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

type Gender = "male" | "female" | "not_specified";

type Profile = {
	dateOfBirth: Date | null;
	gender: Gender;
	location: string | null;
	bio: string | null;
	favoriteGenres: string[];
	favoriteSubgenres: string[];
	websiteUrl: string | null;
	socialLinks: { site: string; url: string }[];
	wpm: number;
};

type Draft = {
	dateOfBirth: Date | null;
	gender: Gender;
	location: string;
	bio: string;
	favoriteGenres: string[];
	favoriteSubgenres: string[];
	websiteUrl: string;
	socialLinks: SocialLinkDraft[];
	wpm: number;
};

const genderOptions: Gender[] = ["male", "female", "not_specified"];

type ProfileT = ReturnType<typeof useTranslations<"settings.profileForm">>;

// Birth dates are stored as UTC midnight; the calendar works in local time.
const utcToLocalDate = (date: Date) =>
	new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
const localToUtcDate = (date: Date) =>
	new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

function draftFromProfile(profile: Profile): Draft {
	return {
		dateOfBirth: profile.dateOfBirth,
		gender: profile.gender,
		location: profile.location ?? "",
		bio: profile.bio ?? "",
		favoriteGenres: profile.favoriteGenres,
		favoriteSubgenres: profile.favoriteSubgenres,
		websiteUrl: profile.websiteUrl ?? "",
		socialLinks: profile.socialLinks.map((link) => ({
			id: link.site,
			site: link.site as SocialSiteSlug,
			url: link.url,
		})),
		wpm: profile.wpm,
	};
}

function payloadFromDraft(draft: Draft) {
	const bioIsEmpty = contentPlainText(draft.bio).trim().length === 0;
	return {
		dateOfBirth: draft.dateOfBirth,
		gender: draft.gender,
		location: draft.location.trim() || null,
		bio: bioIsEmpty ? null : draft.bio,
		favoriteGenres: draft.favoriteGenres,
		favoriteSubgenres: draft.favoriteSubgenres,
		websiteUrl: draft.websiteUrl.trim() || null,
		socialLinks: draft.socialLinks
			.filter((link) => link.site && link.url.trim())
			.map((link) => ({ site: link.site, url: link.url.trim() })),
		wpm: draft.wpm,
	};
}

type Errors = {
	dateOfBirth?: string;
	websiteUrl?: string;
	bio?: string;
	socialLinks: Record<string, string>;
};

function validate(draft: Draft, t: ProfileT): Errors {
	const errors: Errors = { socialLinks: {} };

	if (draft.dateOfBirth) {
		const { earliest, latest } = getBirthDateBounds();
		if (draft.dateOfBirth < earliest || draft.dateOfBirth > latest) {
			errors.dateOfBirth = t("ageRange", {
				min: MIN_USER_AGE,
				max: MAX_USER_AGE,
			});
		}
	}

	const website = draft.websiteUrl.trim();
	if (website) {
		try {
			if (new URL(website).protocol !== "https:") throw new Error();
		} catch {
			errors.websiteUrl = t("websiteInvalid");
		}
	}

	if (contentPlainText(draft.bio).length > PROFILE_BIO_MAX_PLAIN_CHARS) {
		errors.bio = t("bioTooLong", { max: PROFILE_BIO_MAX_PLAIN_CHARS });
	}

	for (const link of draft.socialLinks) {
		const site = socialSites.find((item) => item.slug === link.site);
		const url = link.url.trim();
		if (!site) {
			errors.socialLinks[link.id] = t("socialChooseSite");
		} else if (!url) {
			errors.socialLinks[link.id] = t("socialEnterUrl", { site: site.name });
		} else if (!site.regex.test(url)) {
			errors.socialLinks[link.id] = t("socialWrongUrl", {
				site: site.name,
				example: site.example,
			});
		}
	}

	return errors;
}

function hasErrors(errors: Errors) {
	return Boolean(
		errors.dateOfBirth ||
			errors.websiteUrl ||
			errors.bio ||
			Object.keys(errors.socialLinks).length,
	);
}

function Section({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-4 border border-border px-4 py-5">
			<div>
				<h2 className="font-medium text-base">{title}</h2>
				{description ? (
					<p className="mt-0.5 text-muted-foreground text-sm">{description}</p>
				) : null}
			</div>
			{children}
		</section>
	);
}

function ProfileForm({ initial }: { initial: Profile }) {
	const t = useTranslations("settings.profileForm");
	const f = useFormatters();
	const ids = {
		dob: useId(),
		location: useId(),
		bio: useId(),
		website: useId(),
	};

	const [draft, setDraft] = useState<Draft>(() => draftFromProfile(initial));
	const [showErrors, setShowErrors] = useState(false);
	const [dobOpen, setDobOpen] = useState(false);
	const [wpmOpen, setWpmOpen] = useState(false);
	const [bioPreview, setBioPreview] = useState(false);

	const errors = validate(draft, t);
	const visibleErrors: Errors = showErrors ? errors : { socialLinks: {} };

	const payload = payloadFromDraft(draft);
	const pristine =
		JSON.stringify(payload) ===
		JSON.stringify(payloadFromDraft(draftFromProfile(initial)));

	const saveMutation = useMutation(
		orpc.user.updateMyProfile.mutationOptions({
			onSuccess: (result) => {
				queryClient.setQueryData(orpc.user.getMyProfile.queryKey(), result);
				setShowErrors(false);
				toast.success(t("saved"));
			},
			onError: (error) => {
				toast.error(error.message ?? t("saveFailed"));
			},
		}),
	);

	function patch(next: Partial<Draft>) {
		setDraft((current) => ({ ...current, ...next }));
	}

	const bounds = getBirthDateBounds();
	const earliest = utcToLocalDate(bounds.earliest);
	const latest = utcToLocalDate(bounds.latest);
	const selectedDob = draft.dateOfBirth
		? utcToLocalDate(draft.dateOfBirth)
		: undefined;

	return (
		<form
			className="flex flex-col gap-6"
			noValidate
			onSubmit={(event) => {
				event.preventDefault();
				if (hasErrors(errors)) {
					setShowErrors(true);
					toast.error(t("fixFields"));
					return;
				}
				if (pristine || saveMutation.isPending) return;
				saveMutation.mutate(payload);
			}}
		>
			<Section title={t("aboutYou")}>
				<Field data-invalid={visibleErrors.dateOfBirth ? true : undefined}>
					<FieldLabel htmlFor={ids.dob}>{t("dateOfBirth")}</FieldLabel>
					<Popover open={dobOpen} onOpenChange={setDobOpen}>
						<PopoverTrigger
							render={
								<Button
									id={ids.dob}
									type="button"
									variant="outline"
									aria-invalid={visibleErrors.dateOfBirth ? true : undefined}
									className={cn(
										"w-full justify-start font-normal",
										!selectedDob && "text-muted-foreground",
									)}
								/>
							}
						>
							<CalendarIcon data-icon="inline-start" aria-hidden />
							{selectedDob
								? f.dateWith(selectedDob, { dateStyle: "long" })
								: t("pickDate")}
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start">
							<ProfileBirthDatePicker
								value={selectedDob}
								earliest={earliest}
								latest={latest}
								onSelect={(day) => {
									patch({ dateOfBirth: localToUtcDate(day) });
									setDobOpen(false);
								}}
							/>
						</PopoverContent>
					</Popover>
					<FieldDescription>
						{t("ageRange", { min: MIN_USER_AGE, max: MAX_USER_AGE })}
					</FieldDescription>
					{visibleErrors.dateOfBirth ? (
						<p className="text-destructive text-sm">
							{visibleErrors.dateOfBirth}
						</p>
					) : null}
				</Field>

				<fieldset className="flex flex-col gap-2">
					<legend className="font-medium text-sm">{t("gender")}</legend>
					<RadioGroup
						value={draft.gender}
						onValueChange={(value) => patch({ gender: value as Gender })}
						className="grid-cols-1 sm:grid-cols-3"
					>
						{genderOptions.map((value) => (
							<FieldLabel key={value} htmlFor={`gender-${value}`}>
								<Field orientation="horizontal">
									<FieldContent>
										<FieldTitle>{t(`genders.${value}`)}</FieldTitle>
									</FieldContent>
									<RadioGroupItem id={`gender-${value}`} value={value} />
								</Field>
							</FieldLabel>
						))}
					</RadioGroup>
				</fieldset>

				<Field>
					<FieldLabel htmlFor={ids.location}>{t("location")}</FieldLabel>
					<Input
						id={ids.location}
						autoComplete="address-level2"
						placeholder={t("locationPlaceholder")}
						maxLength={PROFILE_LOCATION_MAX_CHARS}
						value={draft.location}
						onChange={(event) => patch({ location: event.target.value })}
					/>
				</Field>

				<Field data-invalid={visibleErrors.bio ? true : undefined}>
					<div className="flex items-center justify-between">
						<FieldLabel htmlFor={ids.bio}>{t("bio")}</FieldLabel>
						<div className="flex gap-1">
							<Button
								type="button"
								size="sm"
								variant={bioPreview ? "ghost" : "secondary"}
								aria-pressed={!bioPreview}
								onClick={() => setBioPreview(false)}
							>
								{t("write")}
							</Button>
							<Button
								type="button"
								size="sm"
								variant={bioPreview ? "secondary" : "ghost"}
								aria-pressed={bioPreview}
								onClick={() => setBioPreview(true)}
							>
								{t("preview")}
							</Button>
						</div>
					</div>
					{/* Keep the editor mounted so switching tabs never loses its state. */}
					<div className={bioPreview ? "hidden" : undefined}>
						<RichTextEditor
							id={ids.bio}
							enableMentions={false}
							value={draft.bio}
							onChange={(bio) => patch({ bio })}
							placeholder={t("bioPlaceholder")}
							maxPlainLength={PROFILE_BIO_MAX_PLAIN_CHARS}
						/>
					</div>
					{bioPreview ? (
						<div className="min-h-[8rem] border border-input px-3 py-2">
							{contentPlainText(draft.bio).trim() ? (
								<RichContentView content={draft.bio} className="text-sm" />
							) : (
								<p className="text-muted-foreground text-sm">
									{t("nothingToPreview")}
								</p>
							)}
						</div>
					) : null}
					{visibleErrors.bio ? (
						<p className="text-destructive text-sm">{visibleErrors.bio}</p>
					) : null}
				</Field>
			</Section>

			<Section
				title={t("favoriteGenres")}
				description={t("favoriteGenresHelp")}
			>
				<ProfileGenrePicker
					genreSlugs={draft.favoriteGenres}
					subgenreSlugs={draft.favoriteSubgenres}
					onChange={({ genres, subgenres }) =>
						patch({ favoriteGenres: genres, favoriteSubgenres: subgenres })
					}
				/>
			</Section>

			<Section title={t("links")}>
				<Field data-invalid={visibleErrors.websiteUrl ? true : undefined}>
					<FieldLabel htmlFor={ids.website}>{t("website")}</FieldLabel>
					<Input
						id={ids.website}
						type="url"
						inputMode="url"
						autoComplete="url"
						placeholder="https://example.com"
						maxLength={PROFILE_WEBSITE_MAX_CHARS}
						value={draft.websiteUrl}
						aria-invalid={visibleErrors.websiteUrl ? true : undefined}
						onChange={(event) => patch({ websiteUrl: event.target.value })}
					/>
					{visibleErrors.websiteUrl ? (
						<p className="text-destructive text-sm">
							{visibleErrors.websiteUrl}
						</p>
					) : null}
				</Field>

				<div className="flex flex-col gap-2">
					<p className="font-medium text-sm">{t("socialLinks")}</p>
					<ProfileSocialLinksField
						links={draft.socialLinks}
						onChange={(socialLinks) => patch({ socialLinks })}
						errors={visibleErrors.socialLinks}
					/>
				</div>
			</Section>

			<Section title={t("readingSpeed")} description={t("readingSpeedHelp")}>
				<div className="flex items-center justify-between gap-4">
					<p>
						<span className="font-semibold text-3xl tabular-nums">
							{draft.wpm}
						</span>{" "}
						<span className="text-muted-foreground text-sm">
							{t("wordsPerMinute")}
						</span>
					</p>
					<Button
						type="button"
						variant="outline"
						onClick={() => setWpmOpen(true)}
					>
						{t("setWpm")}
					</Button>
				</div>
				<ProfileWpmDialog
					open={wpmOpen}
					onOpenChange={setWpmOpen}
					onApply={(wpm) => patch({ wpm })}
				/>
			</Section>

			<div className="flex flex-col gap-3 border-border border-t pt-4 md:sticky md:bottom-0 md:z-10 md:-mx-1 md:flex-row md:items-center md:justify-between md:bg-background/95 md:px-1 md:py-3 md:backdrop-blur">
				<p className="text-muted-foreground text-sm">
					{pristine ? t("noChanges") : t("unsavedChanges")}
				</p>
				<div className="grid grid-cols-2 gap-2 md:flex">
					<Button
						type="button"
						variant="ghost"
						disabled={pristine || saveMutation.isPending}
						onClick={() => {
							setDraft(draftFromProfile(initial));
							setShowErrors(false);
						}}
					>
						{t("discard")}
					</Button>
					<LoadingButton
						type="submit"
						loading={saveMutation.isPending}
						disabled={pristine}
					>
						{t("saveChanges")}
					</LoadingButton>
				</div>
			</div>
		</form>
	);
}

export function SettingsProfileForm() {
	const t = useTranslations("settings.profileForm");
	const { data, isPending, isError, error } = useQuery(
		orpc.user.getMyProfile.queryOptions({ refetchOnWindowFocus: false }),
	);

	if (isPending) {
		return <p className="text-muted-foreground text-sm">{t("loading")}</p>;
	}

	if (isError || !data) {
		return (
			<p className="text-destructive text-sm">
				{error?.message ?? t("loadFailed")}
			</p>
		);
	}

	return <ProfileForm initial={data as Profile} />;
}
