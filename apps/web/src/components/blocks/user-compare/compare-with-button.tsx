"use client";

import { Button } from "@bbrc/ui/components/button";
import { GitCompareArrows } from "lucide-react";
import type { Route } from "next";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

/**
 * "Compare with <name>" on a member's profile. Hidden when signed out and on your own profile.
 * Reads the session on the client so the profile page itself can stay cached.
 */
export function CompareWithButton({
	username,
	name,
	className,
}: {
	username: string;
	name: string;
	className?: string;
}) {
	const { data: session } = authClient.useSession();
	const me = session?.user?.username;

	if (!me || me === username) return null;

	return (
		<Button
			variant="outline"
			size="sm"
			className={className}
			nativeButton={false}
			render={<Link href={`/users/compare/${me}/${username}` as Route} />}
		>
			<GitCompareArrows data-icon="inline-start" aria-hidden />
			Compare with {name.split(/\s+/)[0]}
		</Button>
	);
}
