import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles, Bookmark, ArrowLeft, Code2, Copy } from "lucide-react";
import { formatDate, truncate } from "@/lib/utils";

export default async function SavedComponentsPage() {
  // DEV MODE: Use mock data when Supabase is not configured
  let user = null;
  let savedComponents: any[] = [];

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;

    if (user) {
      const { data: saved } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_saved", true)
        .order("created_at", { ascending: false });
      savedComponents = saved || [];
    }
  } catch {
    // Supabase not configured, use mock data
  }

  const mockUser = { email: "demo@ruixen.com" };
  const displayUser = user || mockUser;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header user={{ email: displayUser.email || "" }} />

      <main className="mx-auto max-w-4xl px-4 pt-24 pb-12 sm:px-6">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="mb-2 text-2xl font-bold text-white">
            Saved Components
          </h1>
          <p className="text-neutral-400">
            Your bookmarked component generations
          </p>
        </div>

        {savedComponents && savedComponents.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {savedComponents.map((component) => (
              <Card key={component.id} className="card-hover">
                <CardHeader>
                  <CardTitle className="text-base">
                    {truncate(component.prompt, 40)}
                  </CardTitle>
                  <CardDescription>
                    {formatDate(component.created_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border border-white/5 bg-[#0c0c0c] p-3">
                    <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
                      <Code2 className="h-3 w-3" />
                      component.tsx
                    </div>
                    <pre className="max-h-32 overflow-hidden font-mono text-xs text-neutral-400">
                      <code>{truncate(component.result || "", 200)}</code>
                    </pre>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Code2 className="h-3.5 w-3.5" />
                      View Code
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted">
                <Bookmark className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mb-2 text-neutral-300">No saved components yet</p>
              <p className="mb-6 text-sm text-neutral-500">
                Save components from the playground to access them here
              </p>
              <Link href="/playground">
                <Button className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate Components
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
