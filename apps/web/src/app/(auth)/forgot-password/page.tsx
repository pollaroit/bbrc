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
import { ForgotPasswordForm } from "@/components/blocks/forgot-password-form";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
	title: "Forgot password",
	description: "Reset your BBRC password.",
	path: "/forgot-password",
});

export default function ForgotPasswordPage() {
	return (
		<section className="flex w-full items-center justify-center bg-background px-6 py-12 text-foreground">
			<Card className="w-full max-w-sm">
				<CardHeader className="items-center text-center">
					<CardTitle className="mt-4 font-bold text-xl tracking-tight">
						Forgot your password?
					</CardTitle>
					<CardDescription className="text-sm">
						Enter your email and we&apos;ll send a reset link if an account
						exists.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Suspense fallback={null}>
						<ForgotPasswordForm />
					</Suspense>
				</CardContent>
				<CardFooter className="justify-center text-muted-foreground text-sm">
					Remember it?
					<Suspense fallback={null}>
						<AuthPageSwitchLink target="/sign-in" label="Sign in" />
					</Suspense>
				</CardFooter>
			</Card>
		</section>
	);
}
