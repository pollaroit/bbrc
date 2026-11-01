import type { Database } from "@bbrc/db";
import type { AuditActionKey, AuditMetadata } from "@bbrc/shared";
import { o } from "../../o";
import {
	type AuditActor,
	type AuditTarget,
	recordAudit,
} from "./audit.service";

/** What a spec callback is given. Typed loosely: the procedure's own schemas are the real check. */
// biome-ignore lint/suspicious/noExplicitAny: input and output belong to whichever procedure uses this
type Any = any;

export interface AuditArgs {
	input: Any;
	output: Any;
	/** What `before` returned: the target as it was ahead of the change (needed for deletes). */
	before: Any;
	db: Database;
}

export interface AuditSpec<K extends AuditActionKey> {
	/** Reads what the change will destroy or overwrite (a name, the old role). Runs before the handler. */
	before?: (args: { input: Any; db: Database }) => Promise<unknown>;
	/** What the action was done to. Runs after success, so it can read the output. */
	target: (args: AuditArgs) => AuditTarget | Promise<AuditTarget>;
	/** Facts worth keeping, checked against the action's schema in the registry. */
	metadata?: (args: AuditArgs) => AuditMetadata<K> | Promise<AuditMetadata<K>>;
}

/** The marker the coverage test looks for on a procedure's middleware list. */
export const AUDITED = Symbol.for("bbrc.audited");
export const NO_AUDIT = Symbol.for("bbrc.noAudit");

function actorOf(user: {
	id: string;
	name?: string | null;
	username?: string | null;
}): AuditActor {
	return { id: user.id, name: user.name || user.username || "Unknown" };
}

/**
 * Writes an audit entry once the procedure has succeeded: a failed or refused call leaves no
 * trace. Declare it on the procedure next to its role guard:
 *
 *   superAdminProcedure.input(...).use(audited("series.created", { target: ... }))
 *
 * Writing the entry never fails the action (the work is already done); a failure is logged.
 */
export const audited = <K extends AuditActionKey>(
	action: K,
	spec: AuditSpec<K>,
) => {
	const middleware = o.middleware(async ({ context, next }, input) => {
		let before: unknown;
		try {
			before = await spec.before?.({ input, db: context.db });
		} catch (error) {
			console.error(`Audit snapshot for ${action} failed`, error);
		}
		const result = await next();
		const user = context.session?.user;
		if (!user) return result;
		try {
			const args = { input, output: result.output, before, db: context.db };
			await recordAudit(context.db, {
				actor: actorOf(user),
				action,
				target: await spec.target(args),
				metadata: spec.metadata ? await spec.metadata(args) : undefined,
			});
		} catch (error) {
			console.error(`Audit entry ${action} failed`, error);
		}
		return result;
	});
	return Object.assign(middleware, { [AUDITED]: action });
};

/**
 * Says, in the code, that a role-gated mutation is deliberately not logged ("reason" is
 * required and read in review). Does nothing at run time; the coverage test counts it.
 */
export const noAudit = (reason: string) => {
	const middleware = o.middleware(async ({ next }) => next());
	return Object.assign(middleware, { [NO_AUDIT]: reason });
};

export { actorOf };
