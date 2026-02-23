import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Plan credit amounts
const PLAN_CREDITS: Record<string, number> = {
  free: 50,
  pro: 500,
  team: 500, // per seat
};

export async function POST(req: NextRequest) {
  try {
    // Initialize Supabase admin client lazily
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify webhook signature in production
    // For Razorpay: verify using razorpay.validateWebhookSignature
    // For Stripe: verify using stripe.webhooks.constructEvent

    const body = await req.json();
    const { event, payload } = body;

    switch (event) {
      case "payment.success":
      case "subscription.created": {
        const { userId, plan, seats = 1 } = payload;

        // Update user plan
        await supabaseAdmin
          .from("profiles")
          .update({
            plan,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        // Reset credits for the new billing period
        const totalCredits = PLAN_CREDITS[plan] * (plan === "team" ? seats : 1);
        const resetAt = new Date();
        resetAt.setMonth(resetAt.getMonth() + 1);

        await supabaseAdmin
          .from("credits")
          .update({
            total_credits: totalCredits,
            used_credits: 0,
            reset_at: resetAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        break;
      }

      case "subscription.cancelled": {
        const { userId } = payload;

        // Downgrade to free plan
        await supabaseAdmin
          .from("profiles")
          .update({
            plan: "free",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        break;
      }

      case "credits.add": {
        const { userId, amount, type = "bonus" } = payload;

        const { data: credits } = await supabaseAdmin
          .from("credits")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (credits) {
          const field =
            type === "bonus" ? "bonus_credits" : "total_credits";
          const currentValue =
            type === "bonus" ? credits.bonus_credits : credits.total_credits;

          await supabaseAdmin
            .from("credits")
            .update({
              [field]: currentValue + amount,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        }

        break;
      }

      default:
        console.log("Unhandled webhook event:", event);
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message =
      error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
