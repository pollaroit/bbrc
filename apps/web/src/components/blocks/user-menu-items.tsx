"use client";

import {
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
} from "@bbrc/ui/components/dropdown-menu";
import type { LucideIcon } from "lucide-react";
import {
	BarChart3,
	BookCheck,
	BookOpen,
	Check,
	Languages,
	LayoutList,
	MessageSquare,
	Settings,
	Shield,
	Target,
	User,
} from "lucide-react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { useLanguageChoices } from "@/components/blocks/language-picker";
import {
	MobileChromeSheetSection,
	MobileSheetRowBody,
	MobileSheetRowIcon,
	mobileSheetRowClass,
} from "@/components/blocks/mobile-chrome-sheet";
import { UserAccountSignOutButton } from "@/components/blocks/user-account-sign-out-button";
import type { UserPanel } from "@/components/blocks/user-panel";
import { Link } from "@/i18n/navigation";
import { isLanguageSwitchEnabled } from "@/lib/i18n/language-switch";
import { cn } from "@/lib/utils";

type ShellTranslate = ReturnType<typeof useTranslations<"shell.userMenu">>;

type UserMenuUser = React.ComponentProps<typeof UserPanel>["user"];

type UserMenuItemsProps = {
	user: UserMenuUser;
	onNavigate?: () => void;
	itemClassName?: string;
	variant?: "default" | "drawer" | "dropdown";
	hideSignOut?: boolean;
};

type MenuEntry = {
	label: string;
	href: Route;
	icon: LucideIcon;
};

function userMenuActivityEntries(
	user: UserMenuUser,
	t: ShellTranslate,
): MenuEntry[] {
	const base = `/users/${user.username}` as Route;
	return [
		{ label: t("profile"), href: base, icon: User },
		{ label: t("myReads"), href: `${base}/reads` as Route, icon: BookCheck },
		{
			label: t("myPosts"),
			href: `${base}/posts` as Route,
			icon: MessageSquare,
		},
		{
			label: t("myFeedbacks"),
			href: `${base}/feedbacks` as Route,
			icon: BookOpen,
		},
		{
			label: t("myShelves"),
			href: `${base}/shelves` as Route,
			icon: LayoutList,
		},
		{ label: t("myGoals"), href: `${base}/goals` as Route, icon: Target },
		{ label: t("myStats"), href: `${base}/stats` as Route, icon: BarChart3 },
	];
}

function userMenuAccountEntries(
	user: UserMenuUser,
	t: ShellTranslate,
): MenuEntry[] {
	const entries: MenuEntry[] = [
		{ label: t("settings"), href: "/settings" as Route, icon: Settings },
	];
	if (user.isAdmin) {
		entries.push(
			{
				label: t("blockedWorks"),
				href: "/books/blocked" as Route,
				icon: BookOpen,
			},
			{ label: t("dashboard"), href: "/admin" as Route, icon: Shield },
		);
	}
	return entries;
}

/** A "Language" submenu (dropdown) or section (drawer) that follows the same language as Preferences. */
function LanguageMenu({
	variant,
	onNavigate,
}: {
	variant: "dropdown" | "drawer";
	onNavigate?: () => void;
}) {
	const { label, choices, change } = useLanguageChoices();
	if (!isLanguageSwitchEnabled()) return null;

	if (variant === "dropdown") {
		return (
			<DropdownMenuSub>
				<DropdownMenuSubTrigger>
					<Languages aria-hidden />
					{label}
				</DropdownMenuSubTrigger>
				<DropdownMenuSubContent>
					{choices.map((choice) => (
						<DropdownMenuItem
							key={choice.locale}
							onClick={() => {
								change(choice.locale);
								onNavigate?.();
							}}
							lang={choice.locale}
						>
							{choice.active ? (
								<Check aria-hidden />
							) : (
								<span className="size-4" />
							)}
							{choice.name}
						</DropdownMenuItem>
					))}
				</DropdownMenuSubContent>
			</DropdownMenuSub>
		);
	}

	return (
		<MobileChromeSheetSection
			title={label}
			className="[&_h3]:pt-2 [&_h3]:pb-0.5"
		>
			<ul>
				{choices.map((choice) => (
					<li key={choice.locale}>
						<button
							type="button"
							className={cn(
								mobileSheetRowClass,
								"w-full gap-2.5 py-2 text-left",
							)}
							aria-pressed={choice.active}
							lang={choice.locale}
							onClick={() => {
								change(choice.locale);
								onNavigate?.();
							}}
						>
							<MobileSheetRowIcon
								icon={choice.active ? Check : Languages}
								compact
							/>
							<MobileSheetRowBody label={choice.name} />
						</button>
					</li>
				))}
			</ul>
		</MobileChromeSheetSection>
	);
}

function factReplaysHref(user: UserMenuUser): Route {
	return `/users/${user.username}/reels` as Route;
}

export function UserMenuItems({
	user,
	onNavigate,
	itemClassName,
	variant = "default",
	hideSignOut = false,
}: UserMenuItemsProps) {
	const t = useTranslations("shell.userMenu");
	const itemClass = cn(
		"flex w-full items-center gap-3 text-left text-sm transition-colors",
		variant === "drawer" ? mobileSheetRowClass : "px-3 py-2.5 hover:bg-muted",
		itemClassName,
	);

	const activity = userMenuActivityEntries(user, t);
	const account = userMenuAccountEntries(user, t);
	const reelsHref = factReplaysHref(user);

	if (variant === "dropdown") {
		return (
			<>
				<DropdownMenuGroup>
					<DropdownMenuLabel className="text-muted-foreground text-xs">
						{t("yourActivity")}
					</DropdownMenuLabel>
					{activity.map((entry) => (
						<DropdownMenuItem
							key={entry.href}
							render={
								<Link href={entry.href} onClick={onNavigate} prefetch={false} />
							}
							nativeButton={false}
						>
							<entry.icon aria-hidden />
							{entry.label}
						</DropdownMenuItem>
					))}
					<DropdownMenuItem
						render={
							<Link href={reelsHref} onClick={onNavigate} prefetch={false} />
						}
						nativeButton={false}
					>
						<span className="flex size-4 shrink-0 items-center justify-center font-serif text-sm leading-none">
							?
						</span>
						{t("factReplays")}
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuLabel className="text-muted-foreground text-xs">
						{t("account")}
					</DropdownMenuLabel>
					{account.map((entry) => (
						<DropdownMenuItem
							key={entry.href}
							render={
								<Link href={entry.href} onClick={onNavigate} prefetch={false} />
							}
							nativeButton={false}
						>
							<entry.icon aria-hidden />
							{entry.label}
						</DropdownMenuItem>
					))}
					<LanguageMenu variant="dropdown" onNavigate={onNavigate} />
				</DropdownMenuGroup>
			</>
		);
	}

	const drawerRowClass = cn(mobileSheetRowClass, "gap-2.5 py-2", itemClassName);

	if (variant === "drawer") {
		return (
			<nav className="flex flex-col pb-2">
				<MobileChromeSheetSection
					title={t("yourActivity")}
					className="[&_h3]:pt-2 [&_h3]:pb-0.5"
				>
					<ul>
						{activity.map((entry) => (
							<li key={entry.href}>
								<Link
									href={entry.href}
									className={drawerRowClass}
									onClick={onNavigate}
								>
									<MobileSheetRowIcon icon={entry.icon} compact />
									<MobileSheetRowBody label={entry.label} />
								</Link>
							</li>
						))}
						<li>
							<Link
								href={reelsHref}
								className={drawerRowClass}
								onClick={onNavigate}
							>
								<span className="flex size-8 shrink-0 items-center justify-center border border-border bg-muted/20 font-serif text-sm">
									?
								</span>
								<MobileSheetRowBody label={t("factReplays")} />
							</Link>
						</li>
					</ul>
				</MobileChromeSheetSection>
				<MobileChromeSheetSection
					title={t("account")}
					className="[&_h3]:pt-2 [&_h3]:pb-0.5"
				>
					<ul>
						{account.map((entry) => (
							<li key={entry.href}>
								<Link
									href={entry.href}
									className={drawerRowClass}
									onClick={onNavigate}
								>
									<MobileSheetRowIcon icon={entry.icon} compact />
									<MobileSheetRowBody label={entry.label} />
								</Link>
							</li>
						))}
					</ul>
				</MobileChromeSheetSection>
				<LanguageMenu variant="drawer" onNavigate={onNavigate} />
			</nav>
		);
	}

	return (
		<nav className="flex flex-col">
			{activity.map((entry) => (
				<Link
					key={entry.href}
					href={entry.href}
					className={itemClass}
					onClick={onNavigate}
				>
					<entry.icon className="size-4 shrink-0" aria-hidden="true" />
					{entry.label}
				</Link>
			))}
			<Link href={reelsHref} className={itemClass} onClick={onNavigate}>
				<span className="flex size-4 shrink-0 items-center justify-center font-serif text-sm leading-none">
					?
				</span>
				{t("factReplays")}
			</Link>
			{account.map((entry) => (
				<Link
					key={entry.href}
					href={entry.href}
					className={itemClass}
					onClick={onNavigate}
				>
					<entry.icon className="size-4 shrink-0" aria-hidden="true" />
					{entry.label}
				</Link>
			))}
			{hideSignOut ? null : (
				<UserAccountSignOutButton onSignedOut={onNavigate} />
			)}
		</nav>
	);
}
