"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, Zap, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  user?: {
    email: string;
    name?: string;
  } | null;
  credits?: number;
}

export function Header({ user, credits }: HeaderProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-xl"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-foreground">
            <svg
              className="h-4 w-4 text-background"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="font-semibold">Ruixen MCP</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/playground">
            <Button variant="ghost" size="sm">
              Playground
            </Button>
          </Link>
          <Link href="https://ruixen.com/docs" target="_blank">
            <Button variant="ghost" size="sm" className="gap-1.5">
              Docs
              <ExternalLink className="h-3 w-3 opacity-50" />
            </Button>
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {credits !== undefined && (
                <div className="hidden items-center gap-2 rounded-md border px-3 py-1.5 text-sm md:flex">
                  <Zap className="h-3.5 w-3.5" />
                  <span className="text-muted-foreground">Credits:</span>
                  <span className="font-semibold">{credits}</span>
                </div>
              )}
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  Dashboard
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden md:block">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="overflow-hidden border-t bg-background md:hidden">
          <nav className="flex flex-col gap-1 p-4">
            <Link href="/playground" onClick={() => setMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                Playground
              </Button>
            </Link>
            <Link
              href="https://ruixen.com/docs"
              target="_blank"
              onClick={() => setMenuOpen(false)}
            >
              <Button variant="ghost" className="w-full justify-start gap-2">
                Docs
                <ExternalLink className="h-3 w-3 opacity-50" />
              </Button>
            </Link>
            {!user && (
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  Log in
                </Button>
              </Link>
            )}
            {user && credits !== undefined && (
              <div className="mt-2 flex items-center gap-2 rounded-md border px-4 py-3">
                <Zap className="h-4 w-4" />
                <span className="text-muted-foreground">Credits:</span>
                <span className="font-semibold">{credits}</span>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
