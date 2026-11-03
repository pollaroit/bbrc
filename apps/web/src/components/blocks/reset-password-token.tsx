"use client";

import { useSearchParams } from "next/navigation";
import { ResetPasswordForm } from "@/components/blocks/reset-password-form";

export function ResetPasswordToken() {
	const searchParams = useSearchParams();
	const token = searchParams.get("token");
	const error = searchParams.get("error");

	if (error === "INVALID_TOKEN") {
		return <ResetPasswordForm token={null} />;
	}

	return <ResetPasswordForm token={token} />;
}
