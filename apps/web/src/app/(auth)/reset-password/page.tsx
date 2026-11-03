import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPageSwitchLink } from "@/components/blocks/auth-page-switch-link";
import { ResetPasswordToken } from "@/components/blocks/reset-password-token";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
	title: "Reset password",
	description: "Choose a new password for your BBRC account.",
	path: "/reset-password",
});

export default function ResetPasswordPage() {
	return (
		<section className="flex w-full items-center justify-center bg-background px-6 py-12 text-foreground">
			<Card className="w-full max-w-sm">
				<CardHeader className="items-center text-center">
					<CardTitle className="mt-4 font-bold text-xl tracking-tight">
						Choose a new password
					</CardTitle>
					<CardDescription className="text-sm">
						Use at least 7 characters. You will sign in again afterward.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Suspense fallback={null}>
						<ResetPasswordToken />
					</Suspense>
				</CardContent>
				<CardFooter className="justify-center text-muted-foreground text-sm">
					<Suspense fallback={null}>
						<AuthPageSwitchLink target="/sign-in" label="Sign in" />
					</Suspense>
				</CardFooter>
			</Card>
		</section>
	);
}
