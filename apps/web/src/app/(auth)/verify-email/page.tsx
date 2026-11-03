import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailPanel } from "@/components/blocks/verify-email-panel";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
	title: "Verify email",
	description: "Confirm your email address for BBRC.",
	path: "/verify-email",
});

export default function VerifyEmailPage() {
	return (
		<section className="flex w-full items-center justify-center bg-background px-6 py-12 text-foreground">
			<Card className="w-full max-w-sm">
				<CardHeader className="items-center text-center">
					<CardTitle className="mt-4 font-bold text-xl tracking-tight">
						Check your inbox
					</CardTitle>
					<CardDescription className="text-sm">
						Verify your email to sign in to BBRC.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Suspense fallback={null}>
						<VerifyEmailPanel />
					</Suspense>
				</CardContent>
			</Card>
		</section>
	);
}
