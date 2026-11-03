import {
	Body,
	Container,
	Head,
	Heading,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import type { ReactNode } from "react";

const main = {
	backgroundColor: "#f4f4f5",
	fontFamily:
		'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const card = {
	backgroundColor: "#ffffff",
	border: "1px solid #e4e4e7",
	margin: "0 auto",
	padding: "32px 28px",
	maxWidth: "480px",
};

const footer = {
	color: "#71717a",
	fontSize: "12px",
	lineHeight: "18px",
	marginTop: "24px",
};

type AuthEmailLayoutProps = {
	preview: string;
	title: string;
	children: ReactNode;
};

export function AuthEmailLayout({
	preview,
	title,
	children,
}: AuthEmailLayoutProps) {
	return (
		<Html lang="en">
			<Head />
			<Preview>{preview}</Preview>
			<Body style={main}>
				<Container style={card}>
					<Heading
						as="h1"
						style={{
							fontSize: "20px",
							fontWeight: 700,
							margin: "0 0 16px",
							color: "#18181b",
						}}
					>
						{title}
					</Heading>
					<Section>{children}</Section>
					<Text style={footer}>
						If you did not request this, you can ignore this email.
					</Text>
				</Container>
			</Body>
		</Html>
	);
}
