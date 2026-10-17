"use client";

import type { ReactNode } from "react";
import { ComposePostProvider } from "@/components/blocks/compose-post-provider";
import { CreateGoalProvider } from "@/components/blocks/create-goal-provider";
import { GlobalSearchProvider } from "@/components/blocks/global-search-provider";

export function MainShell({ children }: { children: ReactNode }) {
	return (
		<GlobalSearchProvider>
			<ComposePostProvider>
				<CreateGoalProvider>{children}</CreateGoalProvider>
			</ComposePostProvider>
		</GlobalSearchProvider>
	);
}
