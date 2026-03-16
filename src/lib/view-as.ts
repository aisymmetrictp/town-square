import { getCurrentRep } from "@/lib/auth";

/**
 * Resolves the effective rep filter based on the user's role and ?viewAs= param.
 * Returns { rep, viewAsRepName } where viewAsRepName is the rep to filter by,
 * or null if showing all (manager/admin view).
 */
export async function resolveViewAs(
  req: Request
): Promise<{ rep: NonNullable<Awaited<ReturnType<typeof getCurrentRep>>>; filterRepName: string | null } | null> {
  const rep = await getCurrentRep();
  if (!rep) return null;

  const isManagerOrAdmin = rep.role === "manager" || rep.role === "admin";
  const { searchParams } = new URL(req.url);
  const viewAs = searchParams.get("viewAs") ?? "";

  if (isManagerOrAdmin && viewAs) {
    // Manager viewing as a specific rep
    return { rep, filterRepName: viewAs };
  } else if (isManagerOrAdmin) {
    // Manager viewing all
    return { rep, filterRepName: null };
  } else {
    // Regular rep — always filtered to their own data
    return { rep, filterRepName: rep.repName };
  }
}
