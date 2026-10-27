"use client";

import { Button } from "@bbrc/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus } from "lucide-react";
import type { Route } from "next";
import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

export function SittingsPageActions() {
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const { data: ongoing, isPending: isOngoingPending } = useQuery(
		orpc.sitting.getOngoingSitting.queryOptions(),
	);

	if (isSessionPending || isOngoingPending) {
		return null;
	}

	if (ongoing) {
		return (
			<Button
				render={<Link href={`/sittings/${ongoing.slug}` as Route} />}
				nativeButton={false}
				size="sm"
				variant="outline"
			>
				Ongoing sitting
				<ArrowRight data-icon="inline-end" aria-hidden="true" />
			</Button>
		);
	}

	if (!session?.user.isAdmin) {
		return null;
	}

	return (
		<Button
			render={<Link href={"/sittings/new" as Route} />}
			nativeButton={false}
			size="sm"
		>
			<Plus />
			Start new sitting
		</Button>
	);
}
