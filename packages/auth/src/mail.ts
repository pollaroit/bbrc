export type AuthEmailTemplateId =
	| "verifyEmail"
	| "resetPassword"
	| "passwordChanged";

export type AuthMailer = {
	sendTemplate(options: {
		to: string;
		subject: string;
		template: AuthEmailTemplateId;
		props: Record<string, string>;
	}): Promise<void>;
};

export type AuthMailContext = {
	mailer: AuthMailer;
};
