import { type MemberLevelSnapshot, memberLevelsForPoints } from "@bbrc/shared";

export type UserMemberLevels = {
	xpLevel: MemberLevelSnapshot;
	rpLevel: MemberLevelSnapshot;
};

export function userMemberLevelsFromPoints(
	xp: number,
	rp: number,
): UserMemberLevels {
	return memberLevelsForPoints(xp, rp);
}
