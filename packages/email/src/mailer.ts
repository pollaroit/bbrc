import { Resend } from "resend";
import type { EmailTemplateId, EmailTemplateProps } from "./fixtures";
import { renderEmailTemplate } from "./render";

export type MailerConfig = {
	from: string;
	resendApiKey?: string;
	/** When false, messages are logged instead of sent. */
	deliver: boolean;
};

export type SendTemplateOptions<T extends EmailTemplateId> = {
	to: string;
	subject: string;
	template: T;
	props: EmailTemplateProps[T];
};

async function logDevEmail(payload: {
	to: string;
	subject: string;
	html: string;
	text: string;
}) {
	console.info("[email:dev]", {
		to: payload.to,
		subject: payload.subject,
		text: payload.text,
	});
	console.info("[email:dev:html]\n", payload.html);
}

export function createMailer(config: MailerConfig) {
	const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

	async function sendTemplate<T extends EmailTemplateId>(
		options: SendTemplateOptions<T>,
	) {
		const { html, text } = await renderEmailTemplate(
			options.template,
			options.props,
		);

		if (!config.deliver || !resend) {
			await logDevEmail({
				to: options.to,
				subject: options.subject,
				html,
				text,
			});
			return;
		}

		const { error } = await resend.emails.send({
			from: config.from,
			to: options.to,
			subject: options.subject,
			html,
			text,
		});

		if (error) {
			console.error("[email] Resend error", error);
			throw new Error(error.message);
		}
	}

	return { sendTemplate, renderEmailTemplate };
}

export type Mailer = ReturnType<typeof createMailer>;
