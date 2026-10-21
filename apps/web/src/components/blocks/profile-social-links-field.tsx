"use client";

import { type SocialSiteSlug, socialSites } from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@bbrc/ui/components/input-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@bbrc/ui/components/select";
import { Plus, X } from "lucide-react";

/** `site` is empty until the user picks a platform. */
export type SocialLinkDraft = {
	id: string;
	site: SocialSiteSlug | "";
	url: string;
};

type ProfileSocialLinksFieldProps = {
	links: SocialLinkDraft[];
	onChange: (links: SocialLinkDraft[]) => void;
	errors: Record<string, string>;
	disabled?: boolean;
};

export function newSocialLinkDraft(): SocialLinkDraft {
	return { id: crypto.randomUUID(), site: "", url: "" };
}

export function ProfileSocialLinksField({
	links,
	onChange,
	errors,
	disabled,
}: ProfileSocialLinksFieldProps) {
	const usedSites = new Set(links.map((link) => link.site));
	const canAdd = links.length < socialSites.length;

	function update(id: string, patch: Partial<SocialLinkDraft>) {
		onChange(
			links.map((link) => (link.id === id ? { ...link, ...patch } : link)),
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{links.map((link) => {
				const site = socialSites.find((item) => item.slug === link.site);
				const available = socialSites.filter(
					(item) => item.slug === link.site || !usedSites.has(item.slug),
				);
				const error = errors[link.id];

				return (
					<div key={link.id} className="flex flex-col gap-1">
						<InputGroup>
							<InputGroupAddon align="inline-start">
								<Select
									value={link.site || null}
									disabled={disabled}
									onValueChange={(value) =>
										update(link.id, { site: value as SocialSiteSlug })
									}
								>
									<SelectTrigger
										size="sm"
										className="w-32 border-0 bg-transparent px-1 shadow-none"
										aria-label="Social site"
									>
										<SelectValue placeholder="Choose site">
											{site?.name}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{available.map((item) => (
											<SelectItem key={item.slug} value={item.slug}>
												{item.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</InputGroupAddon>
							<InputGroupInput
								type="url"
								inputMode="url"
								value={link.url}
								disabled={disabled || !site}
								placeholder={site?.example ?? "Choose a site first"}
								aria-label={site ? `${site.name} profile URL` : "Profile URL"}
								aria-invalid={error ? true : undefined}
								onChange={(event) =>
									update(link.id, { url: event.target.value })
								}
							/>
							<InputGroupAddon align="inline-end">
								<InputGroupButton
									type="button"
									size="icon-xs"
									aria-label="Remove social link"
									disabled={disabled}
									onClick={() =>
										onChange(links.filter((item) => item.id !== link.id))
									}
								>
									<X />
								</InputGroupButton>
							</InputGroupAddon>
						</InputGroup>
						{error ? <p className="text-destructive text-sm">{error}</p> : null}
					</div>
				);
			})}

			{canAdd ? (
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="w-fit"
					disabled={disabled}
					onClick={() => onChange([...links, newSocialLinkDraft()])}
				>
					<Plus data-icon="inline-start" aria-hidden />
					Add social link
				</Button>
			) : null}
		</div>
	);
}
