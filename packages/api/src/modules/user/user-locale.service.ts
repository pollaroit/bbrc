import type { Database } from "@bbrc/db";
import type { Locale } from "@bbrc/i18n";

export async function setMyLocale(
	userId: string,
	input: { locale: Locale },
	db: Database,
) {
	await db.user.update({
		where: { id: userId },
		data: { locale: input.locale },
		select: { id: true },
	});
	return { locale: input.locale };
}
