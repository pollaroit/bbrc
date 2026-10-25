import { describe, expect, test } from "bun:test";
import {
	isBlockedAddress,
	resolveSafeTarget,
	UnsafeUrlError,
} from "./address-guard";

describe("isBlockedAddress", () => {
	test.each([
		"0.0.0.0",
		"10.0.0.1",
		"10.255.255.255",
		"100.64.0.1",
		"100.127.255.255",
		"127.0.0.1",
		"127.1.2.3",
		"169.254.169.254",
		"172.16.0.1",
		"172.31.255.255",
		"192.168.1.1",
		"192.0.0.1",
		"198.18.0.1",
		"224.0.0.1",
		"239.255.255.255",
		"255.255.255.255",
		"203.0.113.5",
	])("blocks private or reserved IPv4 %s", (ip) => {
		expect(isBlockedAddress(ip)).toBe(true);
	});

	test.each([
		"8.8.8.8",
		"1.1.1.1",
		"93.184.216.34",
		"172.15.0.1",
		"172.32.0.1",
		"100.63.0.1",
		"100.128.0.1",
	])("allows public IPv4 %s", (ip) => {
		expect(isBlockedAddress(ip)).toBe(false);
	});

	test.each([
		"::",
		"::1",
		"fc00::1",
		"fd12:3456::1",
		"fe80::1",
		"fe80::abcd%eth0",
		"ff02::1",
		"::ffff:127.0.0.1",
		"::ffff:10.0.0.1",
		"::ffff:169.254.169.254",
		"::ffff:7f00:1",
		"64:ff9b::a00:1",
		"2001:db8::1",
		"2002:c0a8:101::1",
		"2001:0:4136:e378::1",
		"fec0::1",
	])("blocks private or reserved IPv6 %s", (ip) => {
		expect(isBlockedAddress(ip)).toBe(true);
	});

	test.each(["2606:4700:4700::1111", "2001:4860:4860::8888", "::ffff:8.8.8.8"])(
		"allows public IPv6 %s",
		(ip) => {
			expect(isBlockedAddress(ip)).toBe(false);
		},
	);

	test("anything that is not an address is blocked", () => {
		expect(isBlockedAddress("example.com")).toBe(true);
		expect(isBlockedAddress("")).toBe(true);
		expect(isBlockedAddress("999.1.1.1")).toBe(true);
	});
});

describe("resolveSafeTarget", () => {
	const publicLookup = (async () => [
		{ address: "93.184.216.34", family: 4 },
	]) as never;
	const mixedLookup = (async () => [
		{ address: "93.184.216.34", family: 4 },
		{ address: "10.0.0.5", family: 4 },
	]) as never;
	const failingLookup = (async () => {
		throw new Error("ENOTFOUND");
	}) as never;

	test("accepts a normal https link and pins its address", async () => {
		const target = await resolveSafeTarget(
			"https://example.com/a?b=1",
			publicLookup,
		);
		expect(target.address).toBe("93.184.216.34");
		expect(target.family).toBe(4);
	});

	test.each([
		"http://example.com/",
		"ftp://example.com/",
		"https://user:pass@example.com/",
		"https://example.com:8443/",
		"https://localhost/",
		"https://intranet/",
		"https://printer.local/",
		"https://service.internal/",
		"https://127.0.0.1/",
		"https://[::1]/",
		"https://169.254.169.254/latest/meta-data/",
		"https://[::ffff:10.0.0.1]/",
		"not a url",
	])("refuses %s", async (url) => {
		await expect(resolveSafeTarget(url, publicLookup)).rejects.toBeInstanceOf(
			UnsafeUrlError,
		);
	});

	test("refuses a host that also resolves to a private address", async () => {
		await expect(
			resolveSafeTarget("https://sneaky.example/", mixedLookup),
		).rejects.toBeInstanceOf(UnsafeUrlError);
	});

	test("refuses a host that does not resolve", async () => {
		await expect(
			resolveSafeTarget("https://nope.example/", failingLookup),
		).rejects.toBeInstanceOf(UnsafeUrlError);
	});

	test("accepts a public literal address", async () => {
		const target = await resolveSafeTarget("https://8.8.8.8/", failingLookup);
		expect(target.address).toBe("8.8.8.8");
	});
});
