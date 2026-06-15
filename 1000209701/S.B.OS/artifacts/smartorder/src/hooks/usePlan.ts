import { useAuth } from "./useAuth";

export type PlanName = "starter" | "business" | "pro";

export interface PlanAccess {
  isInTrial: boolean;
  trialDaysLeft: number;
  trialEndsAt: Date | null;
  planName: PlanName;
  fullAccess: boolean;
  locked: Set<string>;
  canCreateProducts: (count: number) => boolean;
  maxProducts: number;
  maxStaff: number;
}

const PLAN_LABELS: Record<PlanName, string> = {
  starter:  "Starter",
  business: "Business",
  pro:      "Pro / Premium",
};

export { PLAN_LABELS };

export function usePlan(): PlanAccess {
  const { business } = useAuth();
  const now = new Date();

  const trialEndsAt = business?.trialEndsAt ? new Date(business.trialEndsAt) : null;
  const isInTrial = trialEndsAt ? now < trialEndsAt : false;
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86400000))
    : 0;

  const planName = ((business?.plan ?? "starter") as PlanName);

  // During trial or on Pro: unlimited access
  if (isInTrial || planName === "pro") {
    return {
      isInTrial, trialDaysLeft, trialEndsAt, planName,
      fullAccess: true,
      locked: new Set<string>(),
      canCreateProducts: () => true,
      maxProducts: Infinity,
      maxStaff: Infinity,
    };
  }

  if (planName === "business") {
    return {
      isInTrial: false, trialDaysLeft: 0, trialEndsAt, planName,
      fullAccess: false,
      locked: new Set(["/dashboard/marketing"]),
      canCreateProducts: (n: number) => n < 100,
      maxProducts: 100,
      maxStaff: 2,
    };
  }

  // starter (default)
  return {
    isInTrial: false, trialDaysLeft: 0, trialEndsAt, planName,
    fullAccess: false,
    locked: new Set(["/dashboard/marketing", "/dashboard/paiements"]),
    canCreateProducts: (n: number) => n < 15,
    maxProducts: 15,
    maxStaff: 1,
  };
}
