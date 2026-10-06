"use client";

import type { ReactNode } from "react";
import { ComposePostProvider } from "@/components/blocks/compose-post-provider";

export function MainShell({ children }: { children: ReactNode }) {
	return <ComposePostProvider>{children}</ComposePostProvider>;
}
