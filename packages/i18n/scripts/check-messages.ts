import { findProblems } from "../src/parity";

const problems = findProblems();
if (problems.length > 0) {
	console.error(`Message check failed (${problems.length}):`);
	for (const problem of problems) console.error(`  - ${problem}`);
	process.exit(1);
}
console.log("Messages: every language matches English.");
