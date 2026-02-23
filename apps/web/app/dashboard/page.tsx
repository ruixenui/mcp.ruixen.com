import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUserCredits } from "@/lib/credits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Clock, Bookmark, Settings, ArrowRight, Zap } from "lucide-react";
import { formatDate, truncate } from "@/lib/utils";

export default async function DashboardPage() {
  let user = null;
  let credits = null;
  let generations: any[] = [];
  let savedCount = 0;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;

    if (user) {
      credits = await getUserCredits(user.id);

      const { data: gens } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      generations = gens || [];

      const { count } = await supabase
        .from("generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_saved", true);
      savedCount = count || 0;
    }
  } catch {
    // Supabase not configured
  }

  const mockUser = { email: "demo@ruixen.com" };
  const mockCredits = { remaining: 50, total: 50, bonus: 0, used: 0, plan: "free" };
  const displayUser = user || mockUser;
  const displayCredits = credits || mockCredits;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-semibold">
            Ruixen MCP
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/playground">
              <Button variant="ghost" size="sm">
                Playground
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground">
              {displayUser.email}
            </span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-1 text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your account.
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Credits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayCredits?.remaining ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                of {(displayCredits?.total ?? 0) + (displayCredits?.bonus ?? 0)} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Generations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayCredits?.used ?? 0}</div>
              <p className="text-xs text-muted-foreground">all time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Bookmark className="h-4 w-4" />
                Saved
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{savedCount ?? 0}</div>
              <p className="text-xs text-muted-foreground">components</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{displayCredits?.plan ?? "Free"}</div>
              <Link href="/dashboard/settings" className="text-xs underline">
                Upgrade
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Recent */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Clock className="h-4 w-4" />
                      Recent Generations
                    </CardTitle>
                    <CardDescription>Your latest components</CardDescription>
                  </div>
                  <Link href="/playground">
                    <Button size="sm">New</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {generations && generations.length > 0 ? (
                  <div className="space-y-3">
                    {generations.map((gen) => (
                      <div key={gen.id} className="flex items-center justify-between rounded-md border p-3">
                        <div>
                          <p className="font-medium">{truncate(gen.prompt, 50)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(gen.created_at)}
                          </p>
                        </div>
                        <span className="rounded border px-2 py-0.5 text-xs">
                          {gen.mode}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No generations yet</p>
                    <Link href="/playground">
                      <Button variant="outline" size="sm" className="mt-4">
                        Create your first
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/playground" className="block">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Playground
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard/components" className="block">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Bookmark className="h-4 w-4" />
                      Saved
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard/settings" className="block">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Settings
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Need More Credits?</CardTitle>
                <CardDescription>Upgrade or use your own API key</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/dashboard/settings">
                  <Button className="w-full">View Plans</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
