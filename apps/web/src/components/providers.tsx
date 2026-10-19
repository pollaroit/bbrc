"use client";

import { Toaster } from "@bbrc/ui/components/sonner";
import { TooltipProvider } from "@bbrc/ui/components/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { PwaOfflineBanner } from "@/components/blocks/pwa-offline-banner";
import { PwaPullToRefresh } from "@/components/blocks/pwa-pull-to-refresh";
import { PwaNotificationEngagement } from "@/lib/pwa/pwa-notification-engagement";
import { PwaServiceWorkerUpdate } from "@/lib/pwa/pwa-service-worker-update";
import { PwaThemeColorSync } from "@/lib/pwa/pwa-theme-color-sync";
import { PwaVisualViewportSync } from "@/lib/pwa/pwa-visual-viewport-sync";
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
					<PwaVisualViewportSync />
					<PwaThemeColorSync />
					<PwaServiceWorkerUpdate />
					<PwaNotificationEngagement />
					<PwaPullToRefresh>
						<PwaOfflineBanner />
						<NuqsAdapter>{children}</NuqsAdapter>
					</PwaPullToRefresh>
					{/* <ReactQueryDevtools /> */}
				</QueryClientProvider>
			</TooltipProvider>
			<Toaster richColors position="top-center" />
		</ThemeProvider>
	);
}
