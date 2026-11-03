"use client";

import { Button } from "@bbrc/ui/components/button";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { verifyEmailCallbackUrl } from "@/lib/auth-routes";

export function VerifyEmailForm({ email }: { email: string | null }) {
	const [isLoading, setIsLoading] = useState(false);

	async function resend() {
		if (!email) {
			toast.error("Enter your email on the sign-up form first.");
			return;
		}

		setIsLoading(true);
		try {
			const { error } = await authClient.sendVerificationEmail({
				email,
				callbackURL: verifyEmailCallbackUrl(window.location.origin),
			});

			if (error) {
				throw new Error(
					error.message ?? "Something went wrong. Please try again.",
				);
			}

			toast.success("Verification email sent.");
		} catch (error) {
			toast.error(
				(error as Error).message ?? "Something went wrong. Please try again.",
			);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<p className="text-muted-foreground text-sm leading-relaxed">
				{email ? (
					<>
						We sent a link to <span className="text-foreground">{email}</span>.
						Open it to verify your address, then sign in.
					</>
				) : (
					<>
						We sent a verification link to your inbox. Open it to finish
						creating your account.
					</>
				)}
			</p>
			<Button
				type="button"
				variant="outline"
				className="w-full"
				disabled={!email || isLoading}
				onClick={() => void resend()}
			>
				{isLoading ? "Sending…" : "Resend verification email"}
			</Button>
			<p className="text-center text-muted-foreground text-sm">
				Already verified?{" "}
				<Link href={"/sign-in" as Route} className="text-foreground underline">
					Sign in
				</Link>
			</p>
		</div>
	);
}
