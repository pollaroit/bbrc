"use client";

import { Button } from "@bbrc/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export function HeaderOngoingReadButton() {
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const { data: ongoing, isPending: isOngoingPending } = useQuery({
		...orpc.sitting.getOngoingSitting.queryOptions(),
		enabled: session != null,
	});

	if (
		isSessionPending ||
		isOngoingPending ||
		!session ||
		!ongoing?.viewerIsParticipant
	) {
		return null;
	}

	return (
		<Button
			render={<Link href={`/sittings/${ongoing.slug}` as Route} />}
			nativeButton={false}
			size="sm"
		>
			Read
		</Button>
	);
}
