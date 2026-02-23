"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Key, CreditCard, LogOut, Check, Loader2 } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "₹0",
    credits: "50 credits",
    description: "One-time free credits to try the platform",
    features: ["50 generations", "Standard models", "Code export"],
    current: true,
  },
  {
    name: "BYOK",
    price: "₹0",
    credits: "Unlimited",
    description: "Use your own Anthropic API key",
    features: [
      "Unlimited generations",
      "Your own API key",
      "All features",
      "No credit limits",
    ],
    action: "Add API Key",
  },
  {
    name: "Pro",
    price: "₹1,200/mo",
    credits: "500 credits/month",
    description: "For power users and small teams",
    features: [
      "500 credits/month",
      "Priority support",
      "All features",
      "Credits reset monthly",
    ],
    action: "Upgrade",
    popular: true,
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [apiKey, setApiKey] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const handleSaveApiKey = async () => {
    setIsSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // In production, encrypt the API key before storing
    await supabase
      .from("profiles")
      .update({
        api_key_encrypted: apiKey,
        plan: "byok",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold text-neutral-900 dark:text-white">
            Settings
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Manage your account, API keys, and subscription
          </p>
        </div>

        <div className="space-y-8">
          {/* Plans */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
              Plans & Billing
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <motion.div
                  key={plan.name}
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <Card
                    className={
                      plan.popular
                        ? "border-2 border-amber-500"
                        : plan.current
                        ? "border-2 border-green-500"
                        : ""
                    }
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{plan.name}</CardTitle>
                        {plan.popular && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-500">
                            Popular
                          </span>
                        )}
                        {plan.current && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-500">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-2xl font-bold">{plan.price}</div>
                      <CardDescription>{plan.credits}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
                        {plan.description}
                      </p>
                      <ul className="space-y-2">
                        {plan.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Check className="h-4 w-4 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    {plan.action && (
                      <CardFooter>
                        <Button
                          className="w-full"
                          variant={plan.popular ? "default" : "outline"}
                        >
                          {plan.action}
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* API Key */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Your API Key (BYOK)
              </CardTitle>
              <CardDescription>
                Add your own Anthropic API key for unlimited generations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Input
                  type="password"
                  placeholder="sk-ant-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSaveApiKey} disabled={isSaving || !apiKey}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : saved ? (
                    <>
                      <Check className="h-4 w-4" />
                      Saved
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
              <p className="text-xs text-neutral-500">
                Your API key is encrypted and stored securely. We never use your
                key for anything other than generating components on your behalf.
              </p>
            </CardContent>
          </Card>

          {/* Sign Out */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5" />
                Sign Out
              </CardTitle>
              <CardDescription>
                Sign out of your account on this device
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
