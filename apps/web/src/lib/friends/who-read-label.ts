export type WhoReadFriend = {
	name: string;
	state: "reading" | "read";
};

function plural(count: number): string {
	return count === 1 ? "friend" : "friends";
}

/** "Ann, Bob and 3 other friends are reading this" (reading wins when anyone is reading now). */
export function whoReadLabel(friends: WhoReadFriend[], total: number): string {
	const count = Math.max(total, friends.length);
	if (count === 0 || friends.length === 0) {
		return "";
	}
	const reading = friends.some((friend) => friend.state === "reading");
	const verb = reading ? (count === 1 ? "is reading" : "are reading") : "read";
	const [first, second] = friends;
	const firstName = first?.name ?? "";
	let who: string;
	if (count === 1) {
		who = firstName;
	} else if (count === 2 && second) {
		who = `${firstName} and ${second.name}`;
	} else if (second) {
		const others = count - 2;
		who = `${firstName}, ${second.name} and ${others} other ${plural(others)}`;
	} else {
		const others = count - 1;
		who = `${firstName} and ${others} other ${plural(others)}`;
	}
	return `${who} ${verb} this`;
}
