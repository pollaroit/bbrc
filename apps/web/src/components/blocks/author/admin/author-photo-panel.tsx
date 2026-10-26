"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import { Input } from "@bbrc/ui/components/input";
import { Label } from "@bbrc/ui/components/label";
import { LoadingButton } from "@bbrc/ui/components/loading-button";
import { useMutation } from "@tanstack/react-query";
import { ImagePlus, Trash2, Wand2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AuthorPhoto } from "@/components/blocks/author/author-photo";
import { ImageCropDialog } from "@/components/blocks/image-crop-dialog";
import {
	ACCEPT_IMAGE_MIME,
	parseAllowedImageMime,
} from "@/lib/storage/image-upload-limits";
import { uploadAuthorPhoto } from "@/lib/storage/upload-author-photo";
import { client } from "@/utils/orpc";

type PhotoSuggestion = {
	imageUrl: string;
	sourceUrl: string;
	credit: string | null;
	license: string | null;
};

export function AuthorPhotoPanel({
	authorId,
	name,
	photoUrl,
	photoCredit,
	photoLicense,
	photoSourceUrl,
	hasWikidata,
	onChanged,
}: {
	authorId: string;
	name: string;
	photoUrl: string | null;
	photoCredit: string | null;
	photoLicense: string | null;
	photoSourceUrl: string | null;
	hasWikidata: boolean;
	onChanged: () => void;
}) {
	const fileInput = useRef<HTMLInputElement>(null);
	const [rawFile, setRawFile] = useState<File | null>(null);
	const [cropOpen, setCropOpen] = useState(false);
	const [credit, setCredit] = useState("");
	const [license, setLicense] = useState("");
	const [suggestion, setSuggestion] = useState<PhotoSuggestion | null>(null);
	const [noSuggestion, setNoSuggestion] = useState(false);

	const suggest = useMutation({
		mutationFn: () => client.authorAdmin.suggestPhoto({ id: authorId }),
		onSuccess: (result) => {
			setSuggestion(result.suggestion);
			setNoSuggestion(result.suggestion == null);
		},
		onError: (error) =>
			toast.error(error.message || "Could not look for a photo."),
	});

	const apply = useMutation({
		mutationFn: () => client.authorAdmin.applyPhoto({ id: authorId }),
		onSuccess: () => {
			setSuggestion(null);
			toast.success("Photo saved.");
			onChanged();
		},
		onError: (error) =>
			toast.error(error.message || "Could not save the photo."),
	});

	const upload = useMutation({
		mutationFn: async (file: File) => {
			const { publicUrl } = await uploadAuthorPhoto(file);
			return client.authorAdmin.uploadPhoto({
				id: authorId,
				photoUrl: publicUrl,
				credit: credit.trim() || null,
				license: license.trim() || null,
			});
		},
		onSuccess: () => {
			setCredit("");
			setLicense("");
			toast.success("Photo saved.");
			onChanged();
		},
		onError: (error) =>
			toast.error(error.message || "Could not upload the photo."),
	});

	const remove = useMutation({
		mutationFn: () => client.authorAdmin.removePhoto({ id: authorId }),
		onSuccess: () => {
			toast.success("Photo removed.");
			onChanged();
		},
		onError: (error) =>
			toast.error(error.message || "Could not remove the photo."),
	});

	const busy =
		suggest.isPending ||
		apply.isPending ||
		upload.isPending ||
		remove.isPending;

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>Photo</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="flex gap-3">
					<AuthorPhoto size="xl" name={name} photoUrl={photoUrl} />
					<div className="flex min-w-0 flex-1 flex-col gap-1 text-muted-foreground text-xs">
						{photoUrl ? (
							<>
								<p>{photoCredit ?? "No credit saved."}</p>
								{photoLicense ? <p>Licence: {photoLicense}</p> : null}
								{photoSourceUrl ? (
									<a
										href={photoSourceUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="w-fit text-foreground underline-offset-4 hover:underline"
									>
										Source page
									</a>
								) : null}
							</>
						) : (
							<p>No photo yet. Photos are only added by an admin.</p>
						)}
					</div>
				</div>

				<div className="flex flex-wrap gap-2">
					<LoadingButton
						type="button"
						variant="outline"
						size="sm"
						loading={suggest.isPending}
						disabled={busy || !hasWikidata}
						onClick={() => suggest.mutate()}
						title={
							hasWikidata
								? undefined
								: "Add a Wikidata id first: the suggestion comes from it."
						}
					>
						<Wand2 data-icon="inline-start" />
						Suggest from Wikimedia Commons
					</LoadingButton>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={busy}
						onClick={() => fileInput.current?.click()}
					>
						<ImagePlus data-icon="inline-start" />
						Upload a photo
					</Button>
					{photoUrl ? (
						<LoadingButton
							type="button"
							variant="ghost"
							size="sm"
							loading={remove.isPending}
							disabled={busy}
							onClick={() => remove.mutate()}
						>
							<Trash2 data-icon="inline-start" />
							Remove
						</LoadingButton>
					) : null}
					<input
						ref={fileInput}
						type="file"
						accept={ACCEPT_IMAGE_MIME}
						className="sr-only"
						tabIndex={-1}
						onChange={(event) => {
							const file = event.target.files?.[0];
							event.target.value = "";
							if (!file) return;
							if (!parseAllowedImageMime(file.type)) {
								toast.error("Use a JPEG, PNG or WebP photo.");
								return;
							}
							setRawFile(file);
							setCropOpen(true);
						}}
					/>
				</div>

				<div className="grid grid-cols-2 gap-2">
					<div className="flex flex-col gap-1">
						<Label htmlFor="author-photo-credit" className="text-xs">
							Credit for an upload
						</Label>
						<Input
							id="author-photo-credit"
							value={credit}
							onChange={(event) => setCredit(event.target.value)}
							placeholder="Photographer"
							maxLength={300}
						/>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="author-photo-license" className="text-xs">
							Licence
						</Label>
						<Input
							id="author-photo-license"
							value={license}
							onChange={(event) => setLicense(event.target.value)}
							placeholder="CC BY-SA 4.0"
							maxLength={120}
						/>
					</div>
				</div>

				{suggestion ? (
					<div className="flex flex-col gap-3 border border-border bg-muted/20 p-3">
						{/* biome-ignore lint/performance/noImgElement: a one-off preview from another site; it is copied to our storage on apply. */}
						<img
							src={suggestion.imageUrl}
							alt={`Suggested portrait of ${name}`}
							referrerPolicy="no-referrer"
							className="max-h-56 w-fit max-w-full object-contain"
						/>
						<div className="flex flex-col gap-0.5 text-muted-foreground text-xs">
							<p>{suggestion.credit ?? "Credit unknown"}</p>
							{suggestion.license ? <p>Licence: {suggestion.license}</p> : null}
							<a
								href={suggestion.sourceUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="w-fit text-foreground underline-offset-4 hover:underline"
							>
								Source page
							</a>
						</div>
						<div className="flex gap-2">
							<LoadingButton
								type="button"
								size="sm"
								loading={apply.isPending}
								onClick={() => apply.mutate()}
							>
								Use this photo
							</LoadingButton>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => setSuggestion(null)}
							>
								Dismiss
							</Button>
						</div>
					</div>
				) : noSuggestion ? (
					<p className="text-muted-foreground text-xs">
						No free photo was found on Wikimedia Commons. You can upload one.
					</p>
				) : null}
			</CardContent>

			<ImageCropDialog
				open={cropOpen}
				onOpenChange={(open) => {
					setCropOpen(open);
					if (!open) setRawFile(null);
				}}
				file={rawFile}
				aspect={1}
				maxEdge={900}
				outputMimeTypes={["image/webp", "image/jpeg"]}
				title="Crop author photo"
				description="A square crop (1:1). We compress the photo before it is uploaded."
				onConfirm={(file) => upload.mutate(file)}
			/>
		</Card>
	);
}
