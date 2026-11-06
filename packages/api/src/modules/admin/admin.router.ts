import { minRoleProcedure, superAdminProcedure } from "../../procedures";
import { audited } from "../audit/audit-middleware";
import { excerpt, memberByUsername } from "../audit/audit-targets";
import {
	AdminBookOverviewOutputSchema,
	GetAdminBookOverviewInputSchema,
	GetAdminBookStatsInputSchema,
	GetAdminBookStatsOutputSchema,
	ListAdminBooksInputSchema,
	ListAdminBooksOutputSchema,
} from "./admin-book.schema";
import {
	getAdminBookOverview,
	getAdminBookStats,
	listAdminBooks,
} from "./admin-book.service";
import {
	AdminCommentOverviewOutputSchema,
	GetAdminCommentOverviewInputSchema,
	GetAdminCommentStatsInputSchema,
	GetAdminCommentStatsOutputSchema,
	ListAdminCommentsInputSchema,
	ListAdminCommentsOutputSchema,
} from "./admin-comment.schema";
import {
	getAdminCommentOverview,
	getAdminCommentStats,
	listAdminComments,
} from "./admin-comment.service";
import {
	AdminDocumentOverviewOutputSchema,
	GetAdminDocumentOverviewInputSchema,
	GetAdminDocumentStatsInputSchema,
	GetAdminDocumentStatsOutputSchema,
	ListAdminDocumentsInputSchema,
	ListAdminDocumentsOutputSchema,
} from "./admin-document.schema";
import {
	getAdminDocumentOverview,
	getAdminDocumentStats,
	listAdminDocuments,
} from "./admin-document.service";
import {
	AdminFactIdInputSchema,
	BatchCreateAdminFactsInputSchema,
	BatchCreateAdminFactsOutputSchema,
	CreateAdminFactInputSchema,
	CreateAdminFactOutputSchema,
	DeleteAdminFactOutputSchema,
	GenerateAdminFactDraftInputSchema,
	GenerateAdminFactDraftOutputSchema,
	ListAdminFactEngagementInputSchema,
	ListAdminFactEngagementOutputSchema,
	ListAdminFactsInputSchema,
	ListAdminFactsOutputSchema,
	ListAdminFactVotesInputSchema,
	PublishAdminFactOutputSchema,
} from "./admin-fact.schema";
import {
	batchCreateAdminFacts,
	createAdminFact,
	deleteAdminFact,
	generateAdminFactDraft,
	listAdminFactImpressions,
	listAdminFacts,
	listAdminFactVotes,
	publishAdminFact,
} from "./admin-fact.service";
import {
	AdminFeedbackOverviewOutputSchema,
	GetAdminFeedbackOverviewInputSchema,
	GetAdminFeedbackStatsInputSchema,
	GetAdminFeedbackStatsOutputSchema,
	ListAdminFeedbacksInputSchema,
	ListAdminFeedbacksOutputSchema,
} from "./admin-feedback.schema";
import {
	getAdminFeedbackOverview,
	getAdminFeedbackStats,
	listAdminFeedbacks,
} from "./admin-feedback.service";
import {
	AdminPostOverviewOutputSchema,
	GetAdminPostOverviewInputSchema,
	GetAdminPostStatsInputSchema,
	GetAdminPostStatsOutputSchema,
	ListAdminPostsInputSchema,
	ListAdminPostsOutputSchema,
} from "./admin-post.schema";
import {
	getAdminPostOverview,
	getAdminPostStats,
	listAdminPosts,
} from "./admin-post.service";
import {
	AdminQuizOverviewOutputSchema,
	GetAdminQuizOverviewInputSchema,
	GetAdminQuizStatsInputSchema,
	GetAdminQuizStatsOutputSchema,
	ListAdminQuizzesInputSchema,
	ListAdminQuizzesOutputSchema,
} from "./admin-quiz.schema";
import {
	getAdminQuizOverview,
	getAdminQuizStats,
	listAdminQuizzes,
} from "./admin-quiz.service";
import {
	AdminSeriesOverviewOutputSchema,
	GetAdminSeriesOverviewInputSchema,
	GetAdminSeriesStatsInputSchema,
	GetAdminSeriesStatsOutputSchema,
	ListAdminSeriesInputSchema,
	ListAdminSeriesOutputSchema,
} from "./admin-series.schema";
import {
	getAdminSeriesOverview,
	getAdminSeriesStats,
	listAdminSeries,
} from "./admin-series.service";
import {
	AdminShelfOverviewOutputSchema,
	GetAdminShelfOverviewInputSchema,
	GetAdminShelfStatsInputSchema,
	GetAdminShelfStatsOutputSchema,
	ListAdminShelvesInputSchema,
	ListAdminShelvesOutputSchema,
} from "./admin-shelf.schema";
import {
	getAdminShelfOverview,
	getAdminShelfStats,
	listAdminShelves,
} from "./admin-shelf.service";
import {
	AdminSittingOverviewOutputSchema,
	GetAdminSittingOverviewInputSchema,
	GetAdminSittingStatsInputSchema,
	GetAdminSittingStatsOutputSchema,
	ListAdminSittingsInputSchema,
	ListAdminSittingsOutputSchema,
} from "./admin-sitting.schema";
import {
	getAdminSittingOverview,
	getAdminSittingStats,
	listAdminSittings,
} from "./admin-sitting.service";
import {
	AdminDeleteUserInputSchema,
	AdminDeleteUserOutputSchema,
	AdminSetUserPasswordInputSchema,
	AdminSetUserPasswordOutputSchema,
	AdminUpdateUserNameInputSchema,
	AdminUpdateUserNameOutputSchema,
	AdminUserOverviewOutputSchema,
	AdminUserStatsOutputSchema,
	AdminVerifyUserEmailInputSchema,
	AdminVerifyUserEmailOutputSchema,
	GetAdminUserOverviewInputSchema,
	GetAdminUserStatsInputSchema,
	ListAdminUsersInputSchema,
	ListAdminUsersOutputSchema,
} from "./admin-user.schema";
import {
	adminDeleteUser,
	adminSetUserPassword,
	adminUpdateUserName,
	adminVerifyUserEmail,
	getAdminUserOverview,
	getAdminUserStats,
	listAdminUsers,
} from "./admin-user.service";

export const adminRouter = {
	getBookOverview: minRoleProcedure("admin")
		.input(GetAdminBookOverviewInputSchema)
		.output(AdminBookOverviewOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminBookOverview(input, context.db),
		),
	listBooks: minRoleProcedure("admin")
		.input(ListAdminBooksInputSchema)
		.output(ListAdminBooksOutputSchema)
		.handler(async ({ input, context }) => listAdminBooks(input, context.db)),
	getBookStats: minRoleProcedure("admin")
		.input(GetAdminBookStatsInputSchema)
		.output(GetAdminBookStatsOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminBookStats(input, context.db),
		),
	getUserOverview: superAdminProcedure
		.input(GetAdminUserOverviewInputSchema)
		.output(AdminUserOverviewOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminUserOverview(input, context.db),
		),
	getUserStats: superAdminProcedure
		.input(GetAdminUserStatsInputSchema)
		.output(AdminUserStatsOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminUserStats(input, context.db),
		),
	listUsers: superAdminProcedure
		.input(ListAdminUsersInputSchema)
		.output(ListAdminUsersOutputSchema)
		.handler(async ({ input, context }) => listAdminUsers(input, context.db)),
	updateUserName: superAdminProcedure
		.input(AdminUpdateUserNameInputSchema)
		.use(
			audited("member.renamed", {
				before: ({ input, db }) => memberByUsername(db, input.username),
				target: ({ before, input }) => ({
					type: "member",
					id: before?.id,
					label: input.name,
				}),
				metadata: ({ before, input }) => ({
					name: { from: before?.name ?? null, to: input.name },
				}),
			}),
		)
		.output(AdminUpdateUserNameOutputSchema)
		.handler(async ({ input, context }) =>
			adminUpdateUserName(input, context.db),
		),
	deleteUser: superAdminProcedure
		.input(AdminDeleteUserInputSchema)
		.use(
			audited("member.deleted", {
				before: ({ input, db }) => memberByUsername(db, input.username),
				target: ({ before, input }) => ({
					type: "member",
					id: before?.id,
					label: before?.name ?? input.username,
				}),
			}),
		)
		.output(AdminDeleteUserOutputSchema)
		.handler(async ({ input, context }) =>
			adminDeleteUser(input, context.session.user.id, context.db),
		),
	setUserPassword: superAdminProcedure
		.input(AdminSetUserPasswordInputSchema)
		.use(
			// Records that it happened, never the password.
			audited("member.password_reset", {
				before: ({ input, db }) => memberByUsername(db, input.username),
				target: ({ before, input }) => ({
					type: "member",
					id: before?.id,
					label: before?.name ?? input.username,
				}),
			}),
		)
		.output(AdminSetUserPasswordOutputSchema)
		.handler(async ({ input, context }) =>
			adminSetUserPassword(input, context.db),
		),
	verifyUserEmail: superAdminProcedure
		.input(AdminVerifyUserEmailInputSchema)
		.use(
			audited("member.email_verified", {
				before: ({ input, db }) => memberByUsername(db, input.username),
				target: ({ before, input }) => ({
					type: "member",
					id: before?.id,
					label: before?.name ?? input.username,
				}),
			}),
		)
		.output(AdminVerifyUserEmailOutputSchema)
		.handler(async ({ input, context }) =>
			adminVerifyUserEmail(input, context.db),
		),
	generateFactDraft: superAdminProcedure
		.input(GenerateAdminFactDraftInputSchema)
		.output(GenerateAdminFactDraftOutputSchema)
		.handler(async ({ input }) => generateAdminFactDraft(input)),
	createFact: superAdminProcedure
		.input(CreateAdminFactInputSchema)
		.use(
			audited("fact.created", {
				target: ({ output }) => ({
					type: "fact",
					id: output.id,
					label: excerpt(output.body),
				}),
			}),
		)
		.output(CreateAdminFactOutputSchema)
		.handler(async ({ input, context }) =>
			createAdminFact(input, context.session.user.id, context.db),
		),
	batchCreateFacts: superAdminProcedure
		.input(BatchCreateAdminFactsInputSchema)
		.use(
			audited("fact.batch_created", {
				target: ({ output }) => ({
					type: "fact",
					label: `${output.created.length} facts`,
				}),
				metadata: ({ output }) => ({ count: output.created.length }),
			}),
		)
		.output(BatchCreateAdminFactsOutputSchema)
		.handler(async ({ input, context }) =>
			batchCreateAdminFacts(input, context.session.user.id, context.db),
		),
	listFacts: superAdminProcedure
		.input(ListAdminFactsInputSchema)
		.output(ListAdminFactsOutputSchema)
		.handler(async ({ input, context }) => listAdminFacts(input, context.db)),
	listFactVotes: superAdminProcedure
		.input(ListAdminFactVotesInputSchema)
		.output(ListAdminFactEngagementOutputSchema)
		.handler(async ({ input, context }) =>
			listAdminFactVotes(input, context.db),
		),
	listFactImpressions: superAdminProcedure
		.input(ListAdminFactEngagementInputSchema)
		.output(ListAdminFactEngagementOutputSchema)
		.handler(async ({ input, context }) =>
			listAdminFactImpressions(input, context.db),
		),
	publishFact: superAdminProcedure
		.input(AdminFactIdInputSchema)
		.use(
			audited("fact.published", {
				target: ({ output }) => ({
					type: "fact",
					id: output.id,
					label: excerpt(output.body),
				}),
			}),
		)
		.output(PublishAdminFactOutputSchema)
		.handler(async ({ input, context }) => publishAdminFact(input, context.db)),
	deleteFact: superAdminProcedure
		.input(AdminFactIdInputSchema)
		.use(
			audited("fact.deleted", {
				before: ({ input, db }) =>
					db.fact.findUnique({
						where: { id: input.id },
						select: { body: true },
					}),
				target: ({ before, input }) => ({
					type: "fact",
					id: input.id,
					label: excerpt(before?.body),
				}),
			}),
		)
		.output(DeleteAdminFactOutputSchema)
		.handler(async ({ input, context }) => deleteAdminFact(input, context.db)),
	getSittingOverview: superAdminProcedure
		.input(GetAdminSittingOverviewInputSchema)
		.output(AdminSittingOverviewOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminSittingOverview(input, context.db),
		),
	listSittings: superAdminProcedure
		.input(ListAdminSittingsInputSchema)
		.output(ListAdminSittingsOutputSchema)
		.handler(async ({ input, context }) =>
			listAdminSittings(input, context.db),
		),
	getSittingStats: superAdminProcedure
		.input(GetAdminSittingStatsInputSchema)
		.output(GetAdminSittingStatsOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminSittingStats(input, context.db),
		),
	getFeedbackOverview: superAdminProcedure
		.input(GetAdminFeedbackOverviewInputSchema)
		.output(AdminFeedbackOverviewOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminFeedbackOverview(input, context.db),
		),
	listFeedbacks: superAdminProcedure
		.input(ListAdminFeedbacksInputSchema)
		.output(ListAdminFeedbacksOutputSchema)
		.handler(async ({ input, context }) =>
			listAdminFeedbacks(input, context.db),
		),
	getFeedbackStats: superAdminProcedure
		.input(GetAdminFeedbackStatsInputSchema)
		.output(GetAdminFeedbackStatsOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminFeedbackStats(input, context.db),
		),
	getQuizOverview: superAdminProcedure
		.input(GetAdminQuizOverviewInputSchema)
		.output(AdminQuizOverviewOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminQuizOverview(input, context.db),
		),
	listQuizzes: superAdminProcedure
		.input(ListAdminQuizzesInputSchema)
		.output(ListAdminQuizzesOutputSchema)
		.handler(async ({ input, context }) => listAdminQuizzes(input, context.db)),
	getQuizStats: superAdminProcedure
		.input(GetAdminQuizStatsInputSchema)
		.output(GetAdminQuizStatsOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminQuizStats(input, context.db),
		),
	getShelfOverview: superAdminProcedure
		.input(GetAdminShelfOverviewInputSchema)
		.output(AdminShelfOverviewOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminShelfOverview(input, context.db),
		),
	listShelves: superAdminProcedure
		.input(ListAdminShelvesInputSchema)
		.output(ListAdminShelvesOutputSchema)
		.handler(async ({ input, context }) => listAdminShelves(input, context.db)),
	getShelfStats: superAdminProcedure
		.input(GetAdminShelfStatsInputSchema)
		.output(GetAdminShelfStatsOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminShelfStats(input, context.db),
		),
	getPostOverview: superAdminProcedure
		.input(GetAdminPostOverviewInputSchema)
		.output(AdminPostOverviewOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminPostOverview(input, context.db),
		),
	listPosts: superAdminProcedure
		.input(ListAdminPostsInputSchema)
		.output(ListAdminPostsOutputSchema)
		.handler(async ({ input, context }) => listAdminPosts(input, context.db)),
	getPostStats: superAdminProcedure
		.input(GetAdminPostStatsInputSchema)
		.output(GetAdminPostStatsOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminPostStats(input, context.db),
		),
	getCommentOverview: superAdminProcedure
		.input(GetAdminCommentOverviewInputSchema)
		.output(AdminCommentOverviewOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminCommentOverview(input, context.db),
		),
	listComments: superAdminProcedure
		.input(ListAdminCommentsInputSchema)
		.output(ListAdminCommentsOutputSchema)
		.handler(async ({ input, context }) =>
			listAdminComments(input, context.db),
		),
	getCommentStats: superAdminProcedure
		.input(GetAdminCommentStatsInputSchema)
		.output(GetAdminCommentStatsOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminCommentStats(input, context.db),
		),
	getDocumentOverview: superAdminProcedure
		.input(GetAdminDocumentOverviewInputSchema)
		.output(AdminDocumentOverviewOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminDocumentOverview(input, context.db),
		),
	listDocuments: superAdminProcedure
		.input(ListAdminDocumentsInputSchema)
		.output(ListAdminDocumentsOutputSchema)
		.handler(async ({ input, context }) =>
			listAdminDocuments(input, context.db),
		),
	getDocumentStats: superAdminProcedure
		.input(GetAdminDocumentStatsInputSchema)
		.output(GetAdminDocumentStatsOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminDocumentStats(input, context.db),
		),
	getSeriesOverview: superAdminProcedure
		.input(GetAdminSeriesOverviewInputSchema)
		.output(AdminSeriesOverviewOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminSeriesOverview(input, context.db),
		),
	listSeries: superAdminProcedure
		.input(ListAdminSeriesInputSchema)
		.output(ListAdminSeriesOutputSchema)
		.handler(async ({ input, context }) => listAdminSeries(input, context.db)),
	getSeriesStats: superAdminProcedure
		.input(GetAdminSeriesStatsInputSchema)
		.output(GetAdminSeriesStatsOutputSchema)
		.handler(async ({ input, context }) =>
			getAdminSeriesStats(input, context.db),
		),
};
