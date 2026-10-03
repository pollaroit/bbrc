import { authClient } from "@/lib/auth-client";

/** Refetch session from the server (e.g. after avatar URL changes). */
export async function refreshAuthSession(options?: {
	imageUrl?: string | null;
}): Promise<void> {
	await authClient.getSession({
		query: {
			disableCookieCache: true,
		},
	});

	// Client session cache may still hold stale user fields until the next full refetch.
	if (options?.imageUrl !== undefined) {
		const client = authClient as {
			$store?: {
				atoms?: {
					session?: {
						get: () => {
							data?: {
								user?: Record<string, unknown> & { image?: string | null };
							} | null;
						} | null;
						set: (value: unknown) => void;
					};
				};
			};
		};

		const sessionAtom = client.$store?.atoms?.session;
		if (sessionAtom) {
			const current = sessionAtom.get();
			if (current?.data?.user) {
				sessionAtom.set({
					...current,
					data: {
						...current.data,
						user: {
							...current.data.user,
							image: options.imageUrl,
						},
					},
				});
			}
		}
	}
}
