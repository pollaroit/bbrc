"use client";

import type { GetSittingBySlugOutput } from "@bbrc/api/modules/sitting/sitting.schema";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link2, LockKeyhole, Mail, ShieldCheck, UserCog } from "lucide-react";
import dynamic from "next/dynamic";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import type { ReactNode } from "react";
import { SittingAdminActions } from "@/components/blocks/sitting-admin-actions";
import { SittingDeadlinesRow } from "@/components/blocks/sitting-admin-deadlines";
import { SittingJoinInvitationsPanel } from "@/components/blocks/sitting-join-invitations-panel";
import { SittingJoinSettingsPanel } from "@/components/blocks/sitting-join-settings-panel";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

// Links pull in the QR code library, so they load only when the tab is opened.
const SittingJoinLinksPanel = dynamic(
	() =>
		import("@/components/blocks/sitting-join-links-panel").then(
			(mod) => mod.SittingJoinLinksPanel,
		),
	{ ssr: false, loading: () => <Skeleton className="h-40 w-full" /> },
);

const TABS = ["joining", "links", "invitations", "admin"] as const;
type Tab = (typeof TABS)[number];

type Section = {
	id: Tab;
	label: string;
	title: string;
	description: string;
	icon: ReactNode;
};

const SECTIONS: readonly Section[] = [
	{
		id: "joining",
		label: "Joining",
		title: "Who can join",
		description: "Choose how members get into this sitting, and until when.",
		icon: <UserCog aria-hidden />,
	},
	{
		id: "links",
		label: "Invite links",
		title: "Invite links and QR codes",
		description:
			"Share a link in a chat or print a QR code. Each link has its own expiry, limit and count.",
		icon: <Link2 aria-hidden />,
	},
	{
		id: "invitations",
		label: "Invitations",
		title: "Add or invite members",
		description:
			"Find a member by name to add them, or invite them to accept or decline.",
		icon: <Mail aria-hidden />,
	},
	{
		id: "admin",
		label: "Admin tools",
		title: "Admin tools",
		description: "Deadlines and actions only club admins can use.",
		icon: <ShieldCheck aria-hidden />,
	},
];

type SittingSettingsViewProps = {
	sitting: GetSittingBySlugOutput;
	isAdmin: boolean;
};

/** The organiser's page: joining, links, invitations and (for admins) admin tools. */
export function SittingSettingsView({
	sitting,
	isAdmin,
}: SittingSettingsViewProps) {
	const sections = SECTIONS.filter((item) => item.id !== "admin" || isAdmin);
	const [tabParam, setTab] = useQueryState(
		"tab",
		parseAsStringLiteral(TABS).withOptions({ history: "replace" }),
	);
	const tab = sections.find((item) => item.id === tabParam)?.id ?? "joining";
	const section = sections.find((item) => item.id === tab) ?? sections[0];

	const state = useQuery(
		orpc.sitting.join.state.queryOptions({
			input: { sittingSlug: sitting.slug },
		}),
	);
	const isPrivate = state.data?.config.joinType === "private";

	return (
		<div className="grid gap-6 md:grid-cols-[13rem_minmax(0,1fr)]">
			<nav aria-label="Settings sections" className="md:sticky md:top-28">
				<ul className="flex gap-1 overflow-x-auto md:flex-col [&::-webkit-scrollbar]:hidden">
					{sections.map((item) => {
						const active = item.id === tab;
						const locked = item.id === "links" && isPrivate;
						return (
							<li key={item.id} className="shrink-0">
								<button
									type="button"
									aria-current={active ? "page" : undefined}
									onClick={() => void setTab(item.id)}
									className={cn(
										"flex w-full items-center gap-2 border border-transparent px-3 py-2 text-start text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring [&_svg]:size-4 [&_svg]:shrink-0",
										active
											? "border-border bg-muted/50 font-medium text-foreground"
											: "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
									)}
								>
									{item.icon}
									{item.label}
									{locked ? (
										<LockKeyhole
											className="ms-auto text-muted-foreground"
											aria-label="Not available for private sittings"
										/>
									) : null}
								</button>
							</li>
						);
					})}
				</ul>
			</nav>

			<section className="flex min-w-0 flex-col gap-5">
				<header className="flex flex-col gap-1 border-border border-b pb-4">
					<h2 className="font-heading font-semibold text-lg tracking-tight">
						{section.title}
					</h2>
					<p className="max-w-prose text-muted-foreground text-sm">
						{section.description}
					</p>
					{tab === "joining" && state.data ? (
						<p
							className={cn(
								"mt-2 flex items-center gap-2 text-xs",
								state.data.window.open
									? "text-success-ink"
									: "text-warning-ink",
							)}
						>
							<span
								className={cn(
									"size-2 shrink-0 rounded-full",
									state.data.window.open ? "bg-success" : "bg-warning",
								)}
								aria-hidden
							/>
							{state.data.window.open
								? "Members can join right now."
								: (state.data.window.message ??
									"Members cannot join by themselves right now.")}
						</p>
					) : null}
				</header>

				{tab === "joining" ? (
					state.data ? (
						<SittingJoinSettingsPanel
							sittingSlug={sitting.slug}
							config={state.data.config}
						/>
					) : (
						<Skeleton className="h-64 w-full" />
					)
				) : null}
				{tab === "links" ? (
					isPrivate ? (
						<p className="border border-border border-dashed p-4 text-muted-foreground text-sm">
							Private sittings have no invite links. Make the sitting Unlisted
							or Public under Joining to create one.
						</p>
					) : (
						<SittingJoinLinksPanel sittingSlug={sitting.slug} />
					)
				) : null}
				{tab === "invitations" ? (
					<SittingJoinInvitationsPanel sittingSlug={sitting.slug} />
				) : null}
				{tab === "admin" && isAdmin ? (
					<ul className="flex flex-col divide-y divide-border border border-border p-4">
						<SittingDeadlinesRow sitting={sitting} />
						<SittingAdminActions sitting={sitting} />
					</ul>
				) : null}
			</section>
		</div>
	);
}
