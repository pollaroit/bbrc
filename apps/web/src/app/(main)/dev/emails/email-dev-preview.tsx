"use client";

type Preview = {
	id: string;
	label: string;
	html: string;
};

export function EmailDevPreview({ previews }: { previews: Preview[] }) {
	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-10">
			<header className="flex flex-col gap-2">
				<h1 className="font-bold text-2xl tracking-tight">Email templates</h1>
				<p className="text-muted-foreground text-sm">
					Development previews with fixture data. Production sends through
					Resend.
				</p>
			</header>
			<div className="flex flex-col gap-12">
				{previews.map((preview) => (
					<section key={preview.id} className="flex flex-col gap-3">
						<h2 className="font-semibold text-lg">{preview.label}</h2>
						{/*
						 * Full React Email documents include <html>/<body>; parsing them into a
						 * div via innerHTML can mutate the app’s document <body> on the client.
						 */}
						<iframe
							title={`${preview.label} preview`}
							srcDoc={preview.html}
							sandbox=""
							className="min-h-[420px] w-full border border-border bg-background"
						/>
					</section>
				))}
			</div>
		</div>
	);
}
