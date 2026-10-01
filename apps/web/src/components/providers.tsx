"use client";

import { Toaster } from "@bbrc/ui/components/sonner";
import { TooltipProvider } from "@bbrc/ui/components/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { queryClient } from "@/utils/orpc";

import { ThemeHotkey } from "./theme-hotkey";
import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			enableColorScheme
			disableTransitionOnChange
		>
			<TooltipProvider>
				<ThemeHotkey />
				<QueryClientProvider client={queryClient}>
					<NuqsAdapter>{children}</NuqsAdapter>
					<ReactQueryDevtools />
				</QueryClientProvider>
			</TooltipProvider>
			<Toaster richColors position="top-center" />
		</ThemeProvider>
	);
}
