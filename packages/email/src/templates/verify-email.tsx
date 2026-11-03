import { Button, Text } from "@react-email/components";
import { AuthEmailLayout } from "./layout";

export type VerifyEmailProps = {
	name: string;
	verifyUrl: string;
};

export function VerifyEmailTemplate({ name, verifyUrl }: VerifyEmailProps) {
	return (
		<AuthEmailLayout
			preview="Confirm your email to finish setting up your BBRC account."
			title="Confirm your email"
		>
			<Text
				style={{ margin: "0 0 16px", color: "#3f3f46", lineHeight: "24px" }}
			>
				Hi {name}, tap the button below to verify your email and sign in to
				BBRC.
			</Text>
			<Button
				href={verifyUrl}
				style={{
					backgroundColor: "#18181b",
					color: "#fafafa",
					display: "inline-block",
					fontSize: "14px",
					fontWeight: 600,
					padding: "12px 20px",
					textDecoration: "none",
				}}
			>
				Verify email
			</Button>
			<Text
				style={{
					margin: "20px 0 0",
					color: "#71717a",
					fontSize: "12px",
					lineHeight: "18px",
				}}
			>
				This link expires in 24 hours. If the button does not work, copy and
				paste this URL into your browser:
				<br />
				<span style={{ wordBreak: "break-all" }}>{verifyUrl}</span>
			</Text>
		</AuthEmailLayout>
	);
}
