"use client";

import { useSearchParams } from "next/navigation";
import { VerifyEmailForm } from "@/components/blocks/verify-email-form";

export function VerifyEmailPanel() {
	const searchParams = useSearchParams();
	const email = searchParams.get("email");

	return <VerifyEmailForm email={email} />;
}
