export const USERNAME_UPDATE_COOLDOWN_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const USERNAME_UPDATE_COOLDOWN_MS =
	USERNAME_UPDATE_COOLDOWN_DAYS * MS_PER_DAY;

export type UsernameUpdateEligibility = {
	canUpdate: boolean;
	nextAllowedAt: Date | null;
};

export function getUsernameUpdateEligibility(
	usernameLastUpdatedAt: Date | null,
	now: Date = new Date(),
): UsernameUpdateEligibility {
	if (!usernameLastUpdatedAt) {
		return { canUpdate: true, nextAllowedAt: null };
	}

	const nextAllowedAt = new Date(
		usernameLastUpdatedAt.getTime() + USERNAME_UPDATE_COOLDOWN_MS,
	);

	return {
		canUpdate: now.getTime() >= nextAllowedAt.getTime(),
		nextAllowedAt,
	};
}
