import {
	EMAIL_FIXTURES,
	EMAIL_TEMPLATE_LABELS,
	type EmailTemplateId,
	renderEmailTemplate,
} from "@bbrc/email";
import { notFound } from "next/navigation";
import { EmailDevPreview } from "./email-dev-preview";

export const dynamic = "force-dynamic";

const TEMPLATE_IDS = Object.keys(EMAIL_FIXTURES) as EmailTemplateId[];

export default async function EmailDevPage() {
	if (process.env.NODE_ENV === "production") {
		notFound();
	}

	const previews = await Promise.all(
		TEMPLATE_IDS.map(async (id) => {
			const props = EMAIL_FIXTURES[id];
			const { html } = await renderEmailTemplate(id, props);
			return {
				id,
				label: EMAIL_TEMPLATE_LABELS[id],
				html,
			};
		}),
	);

	return <EmailDevPreview previews={previews} />;
}
