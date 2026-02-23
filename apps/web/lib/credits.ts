import { createClient } from "@/lib/supabase/server";

export interface UserCredits {
  total: number;
  used: number;
  bonus: number;
  remaining: number;
  plan: string;
}

export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("credits")
    .select("total_credits, used_credits, bonus_credits")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  return {
    total: data.total_credits,
    used: data.used_credits,
    bonus: data.bonus_credits,
    remaining: data.total_credits + data.bonus_credits - data.used_credits,
    plan: profile?.plan || "free",
  };
}

export async function deductCredit(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const credits = await getUserCredits(userId);
  if (!credits || credits.remaining <= 0) return false;

  const { error } = await supabase
    .from("credits")
    .update({
      used_credits: credits.used + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return !error;
}

export async function addCredits(
  userId: string,
  amount: number,
  type: "total" | "bonus" = "bonus"
): Promise<boolean> {
  const supabase = await createClient();

  const credits = await getUserCredits(userId);
  if (!credits) return false;

  const field = type === "bonus" ? "bonus_credits" : "total_credits";
  const currentValue = type === "bonus" ? credits.bonus : credits.total;

  const { error } = await supabase
    .from("credits")
    .update({
      [field]: currentValue + amount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return !error;
}
