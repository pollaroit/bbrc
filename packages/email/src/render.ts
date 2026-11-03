import { render } from "@react-email/render";
import type { EmailTemplateId, EmailTemplateProps } from "./fixtures";
import { PasswordChangedTemplate } from "./templates/password-changed";
import { ResetPasswordTemplate } from "./templates/reset-password";
import { VerifyEmailTemplate } from "./templates/verify-email";

function renderElement<T extends EmailTemplateId>(
	id: T,
	props: EmailTemplateProps[T],
) {
	switch (id) {
		case "verifyEmail":
			return VerifyEmailTemplate(props as EmailTemplateProps["verifyEmail"]);
		case "resetPassword":
			return ResetPasswordTemplate(
				props as EmailTemplateProps["resetPassword"],
			);
		case "passwordChanged":
			return PasswordChangedTemplate(
				props as EmailTemplateProps["passwordChanged"],
			);
		default: {
			const _exhaustive: never = id;
			return _exhaustive;
		}
	}
}

export async function renderEmailTemplate<T extends EmailTemplateId>(
	id: T,
	props: EmailTemplateProps[T],
): Promise<{ html: string; text: string }> {
	const element = renderElement(id, props);
	const html = await render(element);
	const text = await render(element, { plainText: true });
	return { html, text };
}
