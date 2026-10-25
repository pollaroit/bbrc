import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/*
 * Keeps the server from being used to reach things inside our own network.
 * Every address a link resolves to must be a normal public one, and this is
 * checked again on every redirect.
 */

/** True for an IPv4 address (dotted quad) that is not public. */
function isBlockedIpv4(ip: string): boolean {
	const parts = ip.split(".").map(Number);
	if (
		parts.length !== 4 ||
		parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
	) {
		return true;
	}
	const [a, b] = parts as [number, number, number, number];
	if (a === 0) return true; // "this network"
	if (a === 10) return true; // private
	if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
	if (a === 127) return true; // loopback
	if (a === 169 && b === 254) return true; // link-local, cloud metadata
	if (a === 172 && b >= 16 && b <= 31) return true; // private
	if (a === 192 && b === 0) return true; // IETF protocol assignments, TEST-NET-1
	if (a === 192 && b === 168) return true; // private
	if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
	if (a === 198 && b === 51) return true; // TEST-NET-2
	if (a === 203 && b === 0) return true; // TEST-NET-3
	if (a >= 224) return true; // multicast, reserved, broadcast
	return false;
}

/** Expands an IPv6 address into eight 16-bit groups, or null if it is not valid. */
function expandIpv6(ip: string): number[] | null {
	let text = ip.toLowerCase();
	const zone = text.indexOf("%");
	if (zone !== -1) text = text.slice(0, zone);
	// An embedded IPv4 tail (::ffff:1.2.3.4) becomes two groups.
	const tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(text);
	if (tail?.[1]) {
		const v4 = tail[1].split(".").map(Number);
		if (
			v4.length !== 4 ||
			v4.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
		) {
			return null;
		}
		const high = ((v4[0] as number) << 8) | (v4[1] as number);
		const low = ((v4[2] as number) << 8) | (v4[3] as number);
		text = `${text.slice(0, -tail[1].length)}${high.toString(16)}:${low.toString(16)}`;
	}
	const halves = text.split("::");
	if (halves.length > 2) return null;
	const head = halves[0] ? halves[0].split(":") : [];
	const rest = halves[1] !== undefined && halves[1] ? halves[1].split(":") : [];
	const missing = 8 - head.length - rest.length;
	if (halves.length === 2 ? missing < 0 : missing !== 0) return null;
	const groups = [
		...head,
		...(halves.length === 2 ? Array<string>(missing).fill("0") : []),
		...rest,
	];
	if (groups.length !== 8) return null;
	const numbers = groups.map((group) => Number.parseInt(group, 16));
	if (
		numbers.some(
			(n, index) =>
				Number.isNaN(n) ||
				n < 0 ||
				n > 0xffff ||
				!/^[0-9a-f]{1,4}$/.test(groups[index] as string),
		)
	) {
		return null;
	}
	return numbers;
}

function isBlockedIpv6(ip: string): boolean {
	const groups = expandIpv6(ip);
	if (!groups) return true;
	const [g0, g1, g2, g3, g4, g5, g6, g7] = groups as [
		number,
		number,
		number,
		number,
		number,
		number,
		number,
		number,
	];
	// :: and ::1
	if (groups.slice(0, 7).every((n) => n === 0) && (g7 === 0 || g7 === 1))
		return true;
	// IPv4-mapped (::ffff:a.b.c.d) and the deprecated IPv4-compatible form: judge the IPv4 part.
	if (
		g0 === 0 &&
		g1 === 0 &&
		g2 === 0 &&
		g3 === 0 &&
		g4 === 0 &&
		(g5 === 0xffff || g5 === 0)
	) {
		return isBlockedIpv4(`${g6 >> 8}.${g6 & 255}.${g7 >> 8}.${g7 & 255}`);
	}
	// NAT64 (64:ff9b::/96): judge the embedded IPv4 part.
	if (
		g0 === 0x64 &&
		g1 === 0xff9b &&
		g2 === 0 &&
		g3 === 0 &&
		g4 === 0 &&
		g5 === 0
	) {
		return isBlockedIpv4(`${g6 >> 8}.${g6 & 255}.${g7 >> 8}.${g7 & 255}`);
	}
	if ((g0 & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
	if ((g0 & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
	if ((g0 & 0xffc0) === 0xfec0) return true; // fec0::/10 site-local (deprecated)
	if ((g0 & 0xff00) === 0xff00) return true; // multicast
	if (g0 === 0x2001 && g1 === 0x0db8) return true; // documentation
	if (g0 === 0x2002) return true; // 6to4 can wrap private IPv4
	if (g0 === 0x2001 && g1 === 0) return true; // Teredo
	return false;
}

/** True when `ip` (v4 or v6) is not a normal public address. */
export function isBlockedAddress(ip: string): boolean {
	const version = isIP(ip);
	if (version === 4) return isBlockedIpv4(ip);
	if (version === 6) return isBlockedIpv6(ip);
	return true;
}

export class UnsafeUrlError extends Error {}

const BLOCKED_HOSTS =
	/(^|\.)(localhost|local|internal|localdomain|home|lan|corp)$/i;

/** The outcome of checking a link: a validated address the request must connect to. */
export type SafeTarget = { url: URL; address: string; family: 4 | 6 };

/**
 * Checks that a link is an ordinary https link to a public host and returns the
 * address to connect to (so the request cannot be redirected to a different one
 * between this check and the connection).
 */
export async function resolveSafeTarget(
	input: string | URL,
	lookupFn: typeof lookup = lookup,
): Promise<SafeTarget> {
	let url: URL;
	try {
		url = typeof input === "string" ? new URL(input) : input;
	} catch {
		throw new UnsafeUrlError("Not a valid address");
	}
	if (url.protocol !== "https:") throw new UnsafeUrlError("Only https links");
	if (url.username || url.password)
		throw new UnsafeUrlError("No credentials in links");
	if (url.port && url.port !== "443")
		throw new UnsafeUrlError("Only the standard port");

	const host = url.hostname.replace(/^\[|\]$/g, "");
	if (!host || BLOCKED_HOSTS.test(host))
		throw new UnsafeUrlError("Not a public host");

	if (isIP(host)) {
		if (isBlockedAddress(host))
			throw new UnsafeUrlError("Not a public address");
		return { url, address: host, family: isIP(host) === 6 ? 6 : 4 };
	}
	if (!host.includes(".")) throw new UnsafeUrlError("Not a public host");

	let records: { address: string; family: number }[];
	try {
		records = await lookupFn(host, { all: true, verbatim: true });
	} catch {
		throw new UnsafeUrlError("Host not found");
	}
	if (records.length === 0) throw new UnsafeUrlError("Host not found");
	// Every record must be public: a host that also points inside is refused.
	for (const record of records) {
		if (isBlockedAddress(record.address)) {
			throw new UnsafeUrlError("Not a public address");
		}
	}
	const first = records[0] as { address: string; family: number };
	return { url, address: first.address, family: first.family === 6 ? 6 : 4 };
}
