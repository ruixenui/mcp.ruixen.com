import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserCredits } from "@/lib/credits";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credits = await getUserCredits(user.id);

    if (!credits) {
      return NextResponse.json(
        { error: "Credits not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(credits);
  } catch (error: unknown) {
    console.error("Credits fetch error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch credits";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
