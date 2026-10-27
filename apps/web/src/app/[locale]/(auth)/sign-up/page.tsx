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
import SignupForm from "@/components/blocks/sign-up-form";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
	title: "Sign up",
	description: "Create your BBRC account.",
	path: "/sign-up",
});

export default function SignupPage() {
	return (
		<section className="flex w-full items-center justify-center bg-background px-6 py-12 text-foreground">
			<Card className="w-full max-w-sm">
				<CardHeader className="items-center text-center">
					<CardTitle className="mt-4 font-bold text-xl tracking-tight">
						Create your account
					</CardTitle>
					<CardDescription className="text-sm">
						Start reading with BBRC. Let&apos;s read together.
					</CardDescription>
				</CardHeader>

				<CardContent className="flex flex-col gap-6">
					<Suspense fallback={null}>
						<SignupForm />
					</Suspense>
				</CardContent>

				<CardFooter className="justify-center text-muted-foreground text-sm">
					Already have an account?
					<Suspense fallback={null}>
						<AuthPageSwitchLink target="/sign-in" label="Sign in" />
					</Suspense>
				</CardFooter>
			</Card>
		</section>
	);
}
