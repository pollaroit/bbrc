"use client";

import { Button } from "@bbrc/ui/components/button";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@bbrc/ui/components/sheet";
import { ArrowRight, Menu } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { AdminCreateMenu } from "@/components/blocks/admin-create-menu";
import { HeaderOngoingReadButton } from "@/components/blocks/header-ongoing-read-button";
import { NotificationBell } from "@/components/blocks/notification-bell";
import { UserMenu } from "@/components/blocks/user-menu";
import { ModeToggle } from "@/components/mode-toggle";
import { authClient } from "@/lib/auth-client";

const navLinks = [
	{ label: "Home", href: "/" },
	{ label: "Library", href: "/books" },
	{ label: "Sittings", href: "/sittings" },
	{ label: "Members", href: "/users" },
];

export default function Header() {
	const [open, setOpen] = useState(false);
	const { data: session, isPending } = authClient.useSession();

	return (
		<header className="sticky top-0 z-30 w-full border-border border-b bg-background/80 backdrop-blur">
			<div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-6">
				<Link href="/" className="flex shrink-0 items-center gap-2.5">
					<span className="font-bold text-base tracking-tight">BBRC</span>
				</Link>

				<nav className="hidden items-center gap-7 md:flex">
					{navLinks.map((link) => (
						<Link
							key={link.label}
							href={link.href as Route}
							className="font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
						>
							{link.label}
						</Link>
					))}
					<HeaderOngoingReadButton />
				</nav>

				<div className="ml-auto hidden items-center gap-2 md:flex">
					<AdminCreateMenu />
					<ModeToggle />
					{isPending ? null : session ? (
						<>
							<NotificationBell />
							<UserMenu user={session.user} />
						</>
					) : (
						<>
							<Button
								render={<Link href="/sign-in" />}
								nativeButton={false}
								variant="ghost"
								className="text-muted-foreground hover:text-foreground"
							>
								Sign in
							</Button>
							<Button render={<Link href="/sign-up" />} nativeButton={false}>
								Get Started
								<ArrowRight data-icon="inline-end" aria-hidden="true" />
							</Button>
						</>
					)}
				</div>

				<div className="ml-auto flex items-center gap-1 md:hidden">
					<AdminCreateMenu />
					<ModeToggle />
					{!isPending && session ? <NotificationBell /> : null}
					<Sheet open={open} onOpenChange={setOpen}>
						<SheetTrigger
							render={
								<Button variant="outline" size="icon" aria-label="Open menu" />
							}
						>
							<Menu aria-hidden="true" />
						</SheetTrigger>
						<SheetContent side="right" className="w-3/4 max-w-xs">
							<SheetHeader>
								<SheetTitle className="flex items-center gap-2.5">
									BBRC
								</SheetTitle>
							</SheetHeader>

							<nav className="flex flex-col px-4">
								{navLinks.map((link) => (
									<SheetClose
										key={link.label}
										nativeButton={false}
										render={
											<Link
												href={link.href as Route}
												className="border-border border-b py-3 font-medium text-muted-foreground text-sm transition-colors last:border-b-0 hover:text-foreground"
											/>
										}
									>
										{link.label}
									</SheetClose>
								))}
								<div className="border-border border-b py-3 last:border-b-0">
									<HeaderOngoingReadButton />
								</div>
							</nav>

							<SheetFooter>
								{isPending ? null : session ? (
									<UserMenu user={session.user} />
								) : (
									<>
										<SheetClose
											nativeButton={false}
											render={
												<Button
													render={<Link href="/sign-in" />}
													nativeButton={false}
													variant="outline"
													className="w-full"
												/>
											}
										>
											Sign in
										</SheetClose>
										<SheetClose
											nativeButton={false}
											render={
												<Button
													render={<Link href="/sign-up" />}
													nativeButton={false}
													className="w-full"
												/>
											}
										>
											Get Started
											<ArrowRight data-icon="inline-end" aria-hidden="true" />
										</SheetClose>
									</>
								)}
							</SheetFooter>
						</SheetContent>
					</Sheet>
				</div>
			</div>
		</header>
	);
}
