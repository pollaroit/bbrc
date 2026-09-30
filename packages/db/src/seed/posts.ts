import { generateUniqueSlug } from "@bbrc/shared";
import { faker } from "@faker-js/faker";
import type {
	Book,
	Comment,
	Post,
	User,
} from "../../prisma/generated/client.js";
import type { Database } from "../index.js";
import { eligibleParticipants } from "./users.js";

const POST_COUNT = 18;
const MAX_COMMENTS_PER_POST = 6;

const POST_OPENERS = [
	"Finished this month's pick —",
	"Halfway through and loving",
	"Anyone else struggling with",
	"Quick note on",
	"Re-reading",
	"Club poll reminder:",
	"Spoilers ahead for",
	"Can't put down",
] as const;

async function uniquePostSlug(content: string, db: Database): Promise<string> {
	const seed = content.trim().split(/\s+/).slice(0, 8).join(" ") || "club-post";
	const base = seed.length >= 3 ? seed : "club-post";

	return generateUniqueSlug(base, async (candidate) => {
		return (await db.post.findUnique({ where: { slug: candidate } })) == null;
	});
}

async function uniqueCommentSlug(
	content: string,
	db: Database,
): Promise<string> {
	const seed =
		content.trim().split(/\s+/).slice(0, 8).join(" ") || "club-comment";
	const base = seed.length >= 3 ? seed : "club-comment";

	return generateUniqueSlug(base, async (candidate) => {
		return (
			(await db.comment.findUnique({ where: { slug: candidate } })) == null
		);
	});
}

function postContent(bookTitle?: string): string {
	const opener = faker.helpers.arrayElement(POST_OPENERS);
	if (bookTitle && faker.datatype.boolean({ probability: 0.55 })) {
		return `${opener} “${bookTitle}”. ${faker.lorem.sentences({ min: 1, max: 3 })}`;
	}
	return `${opener} ${faker.lorem.sentences({ min: 2, max: 4 })}`;
}

function commentContent(): string {
	return faker.lorem.sentences({ min: 1, max: 2 });
}

function pickLikers(
	users: User[],
	excludeUserId: string,
	count: number,
): User[] {
	const pool = users.filter((user) => user.id !== excludeUserId);
	return faker.helpers.arrayElements(pool, Math.min(count, pool.length));
}

export async function seedPostsAndComments(
	db: Database,
	users: User[],
	books: Book[],
	baseCreatedAt: Date,
): Promise<{ posts: Post[]; comments: Comment[] }> {
	const authors = eligibleParticipants(users);
	const posts: Post[] = [];
	const comments: Comment[] = [];

	for (let index = 0; index < POST_COUNT; index++) {
		const author = faker.helpers.arrayElement(authors);
		const book =
			books.length > 0 && faker.datatype.boolean({ probability: 0.35 })
				? faker.helpers.arrayElement(books)
				: null;
		const content = postContent(book?.title);
		const slug = await uniquePostSlug(content, db);
		const createdAt = faker.date.between({
			from: baseCreatedAt,
			to: new Date(),
		});

		const post = await db.post.create({
			data: {
				slug,
				content,
				authorId: author.id,
				attachedBookId: book?.id ?? null,
				createdAt,
				updatedAt: createdAt,
			},
		});

		posts.push(post);

		const commentCount = faker.number.int({
			min: 0,
			max: MAX_COMMENTS_PER_POST,
		});

		for (let commentIndex = 0; commentIndex < commentCount; commentIndex++) {
			const commentAuthor = faker.helpers.arrayElement(authors);
			const commentBody = commentContent();
			const commentSlug = await uniqueCommentSlug(commentBody, db);
			const commentCreatedAt = faker.date.between({
				from: createdAt,
				to: new Date(),
			});

			const comment = await db.comment.create({
				data: {
					slug: commentSlug,
					content: commentBody,
					authorId: commentAuthor.id,
					postId: post.id,
					createdAt: commentCreatedAt,
					updatedAt: commentCreatedAt,
				},
			});

			comments.push(comment);

			const commentLikers = pickLikers(
				authors,
				commentAuthor.id,
				faker.number.int({ min: 0, max: 4 }),
			);

			for (const liker of commentLikers) {
				await db.like.create({
					data: {
						source: "comment",
						userId: liker.id,
						commentId: comment.id,
						postId: null,
						createdAt: commentCreatedAt,
						updatedAt: commentCreatedAt,
					},
				});
			}
		}

		const postLikers = pickLikers(
			authors,
			author.id,
			faker.number.int({ min: 0, max: 8 }),
		);

		for (const liker of postLikers) {
			await db.like.create({
				data: {
					source: "post",
					userId: liker.id,
					postId: post.id,
					commentId: null,
					createdAt,
					updatedAt: createdAt,
				},
			});
		}
	}

	return { posts, comments };
}
