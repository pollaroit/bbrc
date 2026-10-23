import type { Session } from "@bbrc/auth";
import type { Database } from "@bbrc/db";
import {
	documentFormatFromMime,
	fileMatchesDocumentFormat,
	MAX_DOCS_PER_BOOK,
	MAX_DOCUMENT_BYTES,
} from "@bbrc/shared";
import { ORPCError } from "@orpc/server";
import type { Context } from "../../context";
import { revalidateBookIsr } from "../../revalidate-isr";
import {
	notifyDocumentApproved,
	notifyDocumentRejected,
	notifyDocumentSubmitted,
} from "../notification/notification-triggers";
import {
	deleteDocumentObject,
	parseDocumentMime,
	putDocumentAtKey,
} from "../storage/storage-document.service";
import type {
	ApproveDocumentInput,
	ApproveDocumentOutput,
	DeleteDocumentInput,
	DeleteDocumentOutput,
	GetDocumentForEditOutput,
	ListApprovedDocumentsByBookOutput,
	ListMyDocumentsOutput,
	ListPendingDocumentsOutput,
	RejectDocumentInput,
	RejectDocumentOutput,
	UpdateDocumentInput,
	UpdateDocumentOutput,
} from "./document.schema";
import { generateDocumentSlug } from "./document-slug";

function submitterDisplayName(user: {
	name: string | null;
	username: string;
}): string {
	const name = user.name?.trim();
	return name && name.length > 0 ? name : user.username;
}

async function loadBookBySlugOrThrow(bookSlug: string, db: Database) {
	const book = await db.book.findUnique({
		where: { slug: bookSlug },
		select: { id: true, slug: true, title: true },
	});

	if (!book) {
		throw new ORPCError("NOT_FOUND", { message: "Book not found" });
	}

	return book;
}

async function countApprovedDocuments(bookId: string, db: Database) {
	return db.document.count({
		where: { bookId, status: "approved" },
	});
}

async function assertCanAddDocument(bookId: string, db: Database) {
	const approved = await countApprovedDocuments(bookId, db);
	if (approved >= MAX_DOCS_PER_BOOK) {
		throw new ORPCError("CONFLICT", {
			message: `This book already has ${MAX_DOCS_PER_BOOK} approved documents.`,
		});
	}
}

async function loadDocumentForBook(
	bookSlug: string,
	documentSlug: string,
	db: Database,
) {
	const book = await loadBookBySlugOrThrow(bookSlug, db);
	const document = await db.document.findFirst({
		where: { slug: documentSlug, bookId: book.id },
		select: {
			id: true,
			slug: true,
			name: true,
			language: true,
			status: true,
			documentKey: true,
			userId: true,
			bookId: true,
			book: { select: { slug: true } },
		},
	});

	if (!document) {
		throw new ORPCError("NOT_FOUND", { message: "Document not found" });
	}

	return { book, document };
}

function assertAuthorOrAdmin(document: { userId: string }, session: Session) {
	if (session.user.id !== document.userId && !session.user.isAdmin) {
		throw new ORPCError("FORBIDDEN", {
			message: "You cannot edit this document",
		});
	}
}

export async function createDocumentWithUpload(
	input: {
		bookSlug: string;
		name: string;
		language: string;
		buffer: Buffer;
		contentType: string;
		contentLength: number;
	},
	session: Session,
	db: Database,
	context: Context,
): Promise<{ slug: string; status: "pending" | "approved" }> {
	const contentType = parseDocumentMime(input.contentType);
	if (!contentType) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Only PDF, DOCX and EPUB files are allowed",
		});
	}

	if (input.contentLength > MAX_DOCUMENT_BYTES) {
		throw new ORPCError("BAD_REQUEST", {
			message: "The file must be 10 MB or smaller",
		});
	}

	const format = documentFormatFromMime(contentType);
	if (!format || !fileMatchesDocumentFormat(input.buffer, format)) {
		throw new ORPCError("BAD_REQUEST", {
			message: "The file content doesn't match its format",
		});
	}

	const book = await loadBookBySlugOrThrow(input.bookSlug, db);
	await assertCanAddDocument(book.id, db);

	const autoApprove = session.user.isAdmin;
	const initialStatus = autoApprove ? "approved" : "pending";

	const created = await db.$transaction(async (tx) => {
		const slug = await generateDocumentSlug(input.name, tx);
		const publicUrl = await putDocumentAtKey(book.slug, slug, {
			buffer: input.buffer,
			contentType,
			contentLength: input.contentLength,
		});

		const row = await tx.document.create({
			data: {
				name: input.name.trim(),
				slug,
				language: input.language,
				userId: session.user.id,
				bookId: book.id,
				documentKey: publicUrl,
				status: initialStatus,
			},
			select: { id: true, slug: true, status: true },
		});

		return row;
	});

	if (initialStatus === "pending") {
		void notifyDocumentSubmitted(
			db,
			created.id,
			session.user.id,
			book.slug,
			book.title,
		);
	}

	revalidateBookIsr(context, book.slug);

	return {
		slug: created.slug,
		status: initialStatus,
	};
}

export async function replaceDocumentFile(
	input: {
		bookSlug: string;
		documentSlug: string;
		buffer: Buffer;
		contentType: string;
		contentLength: number;
	},
	session: Session,
	db: Database,
	context: Context,
): Promise<{ slug: string; status: "pending" | "approved" | "rejected" }> {
	const contentType = parseDocumentMime(input.contentType);
	if (!contentType) {
		throw new ORPCError("BAD_REQUEST", {
			message: "Only PDF, DOCX and EPUB files are allowed",
		});
	}

	const format = documentFormatFromMime(contentType);
	if (!format || !fileMatchesDocumentFormat(input.buffer, format)) {
		throw new ORPCError("BAD_REQUEST", {
			message: "The file content doesn't match its format",
		});
	}

	const { book, document } = await loadDocumentForBook(
		input.bookSlug,
		input.documentSlug,
		db,
	);
	assertAuthorOrAdmin(document, session);

	if (document.status === "approved" && !session.user.isAdmin) {
		await assertCanAddDocument(book.id, db);
	}

	const previousUrl = document.documentKey;
	const publicUrl = await putDocumentAtKey(book.slug, document.slug, {
		buffer: input.buffer,
		contentType,
		contentLength: input.contentLength,
	});

	const nextStatus =
		document.status === "approved" && !session.user.isAdmin
			? "pending"
			: document.status === "approved"
				? "approved"
				: "pending";

	const updated = await db.document.update({
		where: { id: document.id },
		data: {
			documentKey: publicUrl,
			status: nextStatus,
			acceptanceNotes: nextStatus === "pending" ? null : undefined,
			rejectionReason: nextStatus === "pending" ? null : undefined,
		},
		select: { slug: true, status: true },
	});

	// Same format reuses the key, so only a different key leaves an old file behind.
	if (previousUrl !== publicUrl) {
		await deleteDocumentObject(previousUrl);
	}

	if (nextStatus === "pending" && document.status === "approved") {
		void notifyDocumentSubmitted(
			db,
			document.id,
			session.user.id,
			book.slug,
			book.title,
		);
	}

	revalidateBookIsr(context, book.slug);

	return { slug: updated.slug, status: updated.status };
}

export async function listApprovedDocumentsByBook(
	bookSlug: string,
	db: Database,
): Promise<ListApprovedDocumentsByBookOutput> {
	const book = await loadBookBySlugOrThrow(bookSlug, db);

	const rows = await db.document.findMany({
		where: { bookId: book.id, status: "approved" },
		orderBy: [{ createdAt: "desc" }, { slug: "desc" }],
		select: {
			slug: true,
			name: true,
			language: true,
			documentKey: true,
			createdAt: true,
			user: { select: { username: true, name: true } },
		},
	});

	return {
		items: rows.map((row) => ({
			slug: row.slug,
			name: row.name,
			language: row.language,
			documentUrl: row.documentKey,
			createdAt: row.createdAt,
			uploader: {
				username: row.user.username,
				name: submitterDisplayName(row.user),
			},
		})),
	};
}

export async function getDocumentForEdit(
	bookSlug: string,
	documentSlug: string,
	session: Session,
	db: Database,
): Promise<GetDocumentForEditOutput> {
	const { book, document } = await loadDocumentForBook(
		bookSlug,
		documentSlug,
		db,
	);
	assertAuthorOrAdmin(document, session);

	return {
		slug: document.slug,
		name: document.name,
		language: document.language,
		status: document.status,
		documentUrl: document.documentKey,
		bookSlug: book.slug,
	};
}

export async function updateDocumentMetadata(
	input: UpdateDocumentInput,
	session: Session,
	db: Database,
	context: Context,
): Promise<UpdateDocumentOutput> {
	const { book, document } = await loadDocumentForBook(
		input.bookSlug,
		input.documentSlug,
		db,
	);
	assertAuthorOrAdmin(document, session);

	if (document.status === "approved" && !session.user.isAdmin) {
		throw new ORPCError("FORBIDDEN", {
			message: "Approved documents cannot change metadata without admin access",
		});
	}

	const updated = await db.document.update({
		where: { id: document.id },
		data: {
			name: input.name.trim(),
			language: input.language,
		},
		select: { slug: true, status: true },
	});

	revalidateBookIsr(context, book.slug);

	return updated;
}

export async function deleteDocument(
	input: DeleteDocumentInput,
	session: Session,
	db: Database,
	context: Context,
): Promise<DeleteDocumentOutput> {
	const { book, document } = await loadDocumentForBook(
		input.bookSlug,
		input.documentSlug,
		db,
	);

	const isOwner = session.user.id === document.userId;
	const isAdmin = session.user.isAdmin;

	if (!isAdmin && !isOwner) {
		throw new ORPCError("FORBIDDEN", {
			message: "You cannot delete this document",
		});
	}

	if (
		!isAdmin &&
		document.status !== "pending" &&
		document.status !== "rejected"
	) {
		throw new ORPCError("FORBIDDEN", {
			message: "Only pending or rejected documents can be deleted",
		});
	}

	await deleteDocumentObject(document.documentKey);
	await db.document.delete({ where: { id: document.id } });

	revalidateBookIsr(context, book.slug);

	return { slug: document.slug };
}

export async function listPendingDocuments(
	db: Database,
): Promise<ListPendingDocumentsOutput> {
	const rows = await db.document.findMany({
		where: { status: "pending" },
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: {
			id: true,
			slug: true,
			name: true,
			language: true,
			createdAt: true,
			book: { select: { slug: true, title: true } },
			user: { select: { username: true, name: true } },
		},
	});

	return {
		count: rows.length,
		items: rows.map((row) => ({
			id: row.id,
			slug: row.slug,
			name: row.name,
			language: row.language,
			createdAt: row.createdAt,
			bookSlug: row.book.slug,
			bookTitle: row.book.title,
			submitter: {
				username: row.user.username,
				name: submitterDisplayName(row.user),
			},
		})),
	};
}

export async function listMyDocuments(
	userId: string,
	db: Database,
): Promise<ListMyDocumentsOutput> {
	const rows = await db.document.findMany({
		where: { userId },
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: {
			id: true,
			slug: true,
			name: true,
			language: true,
			status: true,
			createdAt: true,
			acceptanceNotes: true,
			rejectionReason: true,
			book: { select: { slug: true, title: true } },
		},
	});

	return {
		count: rows.length,
		items: rows.map((row) => ({
			id: row.id,
			slug: row.slug,
			name: row.name,
			language: row.language,
			status: row.status,
			createdAt: row.createdAt,
			bookSlug: row.book.slug,
			bookTitle: row.book.title,
			acceptanceNotes: row.acceptanceNotes,
			rejectionReason: row.rejectionReason,
		})),
	};
}

export async function approveDocument(
	input: ApproveDocumentInput,
	db: Database,
	context: Context,
): Promise<ApproveDocumentOutput> {
	const document = await db.document.findUnique({
		where: { id: input.id },
		select: {
			id: true,
			status: true,
			userId: true,
			book: { select: { id: true, slug: true, title: true } },
		},
	});

	if (!document) {
		throw new ORPCError("NOT_FOUND", { message: "Document not found" });
	}

	if (document.status !== "pending") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Only pending documents can be approved",
		});
	}

	const approved = await countApprovedDocuments(document.book.id, db);
	if (approved >= MAX_DOCS_PER_BOOK) {
		throw new ORPCError("CONFLICT", {
			message: `This book already has ${MAX_DOCS_PER_BOOK} approved documents.`,
		});
	}

	await db.document.update({
		where: { id: document.id },
		data: {
			status: "approved",
			acceptanceNotes: input.acceptanceNotes?.trim() || null,
			rejectionReason: null,
		},
	});

	void notifyDocumentApproved(
		db,
		document.userId,
		document.book.slug,
		document.book.title,
	);

	revalidateBookIsr(context, document.book.slug);

	return { id: document.id };
}

export async function rejectDocument(
	input: RejectDocumentInput,
	db: Database,
	context: Context,
): Promise<RejectDocumentOutput> {
	const document = await db.document.findUnique({
		where: { id: input.id },
		select: {
			id: true,
			status: true,
			userId: true,
			book: { select: { slug: true, title: true } },
		},
	});

	if (!document) {
		throw new ORPCError("NOT_FOUND", { message: "Document not found" });
	}

	if (document.status !== "pending") {
		throw new ORPCError("BAD_REQUEST", {
			message: "Only pending documents can be rejected",
		});
	}

	await db.document.update({
		where: { id: document.id },
		data: {
			status: "rejected",
			rejectionReason: input.rejectionReason.trim(),
			acceptanceNotes: null,
		},
	});

	void notifyDocumentRejected(
		db,
		document.userId,
		document.book.slug,
		document.book.title,
		input.rejectionReason.trim(),
	);

	revalidateBookIsr(context, document.book.slug);

	return { id: document.id };
}
