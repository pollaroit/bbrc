"use client";

import { Button } from "@bbrc/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import { SittingCardJoinButton } from "@/components/blocks/sitting-card-join-button";
import { Link } from "@/i18n/navigation";
import { orpc } from "@/utils/orpc";

type OngoingSittingActionProps = {
	slug: string;
	status: "voting" | "reading" | "finished";
	deadline: Date | string;
};

/**
 * The banner is cached for everyone, so what the button says depends on who
 * is looking: Join if they can, Vote in poll if they are in, otherwise Open.
 */
export function OngoingSittingAction({
	slug,
	status,
	deadline,
}: OngoingSittingActionProps) {
	const { data: state } = useQuery(
		orpc.sitting.join.state.queryOptions({ input: { sittingSlug: slug } }),
	);

	if (state?.viewer.canJoin) {
		return (
			<SittingCardJoinButton
				slug={slug}
				status={status}
				deadline={deadline}
				variant="default"
				className="w-full md:w-auto"
			/>
		);
	}

	const votes =
		status === "voting" && (state == null || state.viewer.isParticipant);
	const href = (
		status === "voting" && votes
			? `/sittings/${slug}/vote`
			: `/sittings/${slug}`
	) as Route;

	return (
		<Button
			render={<Link href={href} />}
			nativeButton={false}
			size="sm"
			className="w-full md:w-auto"
		>
			{votes ? "Vote in poll" : "Open sitting"}
			<ArrowRight data-icon="inline-end" />
		</Button>
	);
}
