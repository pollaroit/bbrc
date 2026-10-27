import {
	createLooseTranslator,
	getMessages,
	type Locale,
	type Messages,
} from "@bbrc/i18n";
import { resolveClubTimeZone } from "@bbrc/shared";

type Catalog = Messages["notifications"]["messages"];

/** Every notification text there is (`"pollVoteFirst"`, `"shelfInvitation"` ...). */
export type NotificationMessageId = keyof Catalog;

/** Plain values a text is built from. Dates are written as ISO strings in the database. */
export type NotificationValues = Record<string, string | number | boolean>;

/** What is stored in `Notification.params`: which text, and its values. */
export type NotificationParams = {
	id: NotificationMessageId;
	values: NotificationValues;
};

export type NotificationText = { title: string; body: string };

/** Values named `...At` are moments (ISO strings); texts format them as dates. */
function toIcuValues(values: NotificationValues) {
	return Object.fromEntries(
		Object.entries(values).map(([key, value]) => [
			key,
			key.endsWith("At") && typeof value === "string" ? new Date(value) : value,
		]),
	);
}

/** True when `id` names a text in the catalog (a stored row may hold an id that was removed). */
export function isNotificationMessageId(
	id: unknown,
): id is NotificationMessageId {
	return (
		typeof id === "string" && id in getMessages("en").notifications.messages
	);
}

/**
 * The title and body of a notification in a language. The ICU message takes `values`
 * (`{actor}`, plural counts, dates); dates are shown in the club's time zone.
 */
export function notificationText(
	id: NotificationMessageId,
	values: NotificationValues,
	locale: Locale,
): NotificationText {
	const translator = createLooseTranslator(
		locale,
		`notifications.messages.${id}`,
		{ timeZone: resolveClubTimeZone() },
	);
	const icu = toIcuValues(values);
	return { title: translator("title", icu), body: translator("body", icu) };
}

/**
 * What a stored notification row shows to a reader: its text in the reader's language when the
 * row has parameters, otherwise the English text it was saved with (older rows).
 */
export function renderStoredNotification(
	row: { title: string; body: string; params: unknown },
	locale: Locale,
): NotificationText {
	const params = row.params as Partial<NotificationParams> | null;
	if (params && isNotificationMessageId(params.id)) {
		try {
			return notificationText(params.id, params.values ?? {}, locale);
		} catch {
			// A text that cannot be built falls back to the saved English one.
		}
	}
	return { title: row.title, body: row.body };
}
