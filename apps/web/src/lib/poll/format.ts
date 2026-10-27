import type { PollOption } from "@bbrc/api/modules/post-poll/post-poll.schema";
import type { Formatters } from "@bbrc/i18n";
import { authorNameToSlug } from "@bbrc/shared";

/** "2d 4h left", "35 min left", "Ended". */
export function formatTimeLeft(deadline: Date, now: Date = new Date()): string {
	const ms = deadline.getTime() - now.getTime();
	if (ms <= 0) return "Ended";
	const minutes = Math.ceil(ms / 60_000);
	if (minutes < 60) return `${minutes} min left`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		const rest = minutes % 60;
		return rest > 0 && hours < 6 ? `${hours}h ${rest}m left` : `${hours}h left`;
	}
	const days = Math.floor(hours / 24);
	const restHours = hours % 24;
	return restHours > 0 && days < 4
		? `${days}d ${restHours}h left`
		: `${days}d left`;
}

/** Regional-indicator flag for an ISO alpha-2 code. */
export function countryFlag(code: string | null | undefined): string {
	if (!code || !/^[A-Za-z]{2}$/.test(code)) return "";
	return String.fromCodePoint(
		...code
			.toUpperCase()
			.split("")
			.map((char) => 0x1f1e6 + char.charCodeAt(0) - 65),
	);
}

/** Where an option points on the site, when it points anywhere. */
export function pollOptionHref(option: PollOption): string | null {
	switch (option.kind) {
		case "book":
			return option.target.slug ? `/books/${option.target.slug}` : null;
		case "series":
			return option.target.slug ? `/series/${option.target.slug}` : null;
		case "author":
			return `/authors/${authorNameToSlug(option.label)}`;
		case "user":
			return option.target.username ? `/users/${option.target.username}` : null;
		default:
			return null;
	}
}

export function percent(f: Formatters, share: number): string {
	const value = share * 100;
	return `${value >= 10 || value === 0 ? f.number(Math.round(value)) : f.decimal(value, 1)}%`;
}

export const PENDING_OPTION_PREFIX = "pending-option__";

export function isPendingOption(id: string): boolean {
	return id.startsWith(PENDING_OPTION_PREFIX);
}
