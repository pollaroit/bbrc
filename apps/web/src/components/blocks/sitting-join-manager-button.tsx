"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@bbrc/ui/components/dialog";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@bbrc/ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import { Settings2 } from "lucide-react";
import dynamic from "next/dynamic";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { SittingJoinInvitationsPanel } from "@/components/blocks/sitting-join-invitations-panel";
import { SittingJoinSettingsPanel } from "@/components/blocks/sitting-join-settings-panel";
import { orpc } from "@/utils/orpc";

// Links pull in the QR code library, so they load only when the tab is opened.
const SittingJoinLinksPanel = dynamic(
	() =>
		import("@/components/blocks/sitting-join-links-panel").then(
			(mod) => mod.SittingJoinLinksPanel,
		),
	{ ssr: false },
);

const TABS = ["settings", "links", "invitations"] as const;

/** Organisers only: who can join, the invitation links, and invitations by name. */
export function SittingJoinManagerButton({
	sittingSlug,
}: {
	sittingSlug: string;
}) {
	const state = useQuery(
		orpc.sitting.join.state.queryOptions({ input: { sittingSlug } }),
	);
	const [tab, setTab] = useQueryState(
		"joining",
		parseAsStringLiteral(TABS).withOptions({ history: "replace" }),
	);

	if (!state.data?.viewer.canManage) return null;
	const { config, window: joinWindow } = state.data;
	const isPrivate = config.joinType === "private";

	return (
		<>
			<Button
				size="sm"
				variant="outline"
				onClick={() => void setTab("settings")}
			>
				<Settings2 data-icon="inline-start" aria-hidden />
				Joining
			</Button>
			<Dialog
				open={tab != null}
				onOpenChange={(open) => {
					if (!open) void setTab(null);
				}}
			>
				<DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>Joining this sitting</DialogTitle>
						<DialogDescription>
							{joinWindow.open
								? "Members can join right now."
								: (joinWindow.message ??
									"Members cannot join by themselves now.")}
						</DialogDescription>
					</DialogHeader>
					<Tabs
						value={tab ?? "settings"}
						onValueChange={(next) => void setTab(next as (typeof TABS)[number])}
					>
						<TabsList variant="line">
							<TabsTrigger value="settings">Settings</TabsTrigger>
							<TabsTrigger value="links" disabled={isPrivate}>
								Links
							</TabsTrigger>
							<TabsTrigger value="invitations">Invitations</TabsTrigger>
						</TabsList>
						<TabsContent value="settings">
							<SittingJoinSettingsPanel
								sittingSlug={sittingSlug}
								config={config}
							/>
						</TabsContent>
						<TabsContent value="links">
							{tab === "links" ? (
								<SittingJoinLinksPanel sittingSlug={sittingSlug} />
							) : null}
						</TabsContent>
						<TabsContent value="invitations">
							<SittingJoinInvitationsPanel sittingSlug={sittingSlug} />
						</TabsContent>
					</Tabs>
				</DialogContent>
			</Dialog>
		</>
	);
}
