import type { Icon } from "@phosphor-icons/react";
import {
  ActivityIcon,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Broadcast,
  Cards,
  CheckCircle,
  Clock,
  Copy,
  Database,
  Eye,
  FileMagnifyingGlass,
  FilePlus,
  GitBranch,
  IdentificationCard,
  Lightning,
  Link,
  ListChecks,
  LockKey,
  MagnifyingGlass,
  Scales,
  Scan,
  SealCheck,
  ShieldCheck,
  ShieldWarning,
  SidebarSimple,
  Sparkle,
  TrendUp,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

type CompatIcon = Icon & {
  defaultProps?: {
    weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  };
};

function withDefaultWeight(icon: Icon, weight: NonNullable<CompatIcon["defaultProps"]>["weight"] = "duotone"): CompatIcon {
  const compatIcon = icon as CompatIcon;
  compatIcon.defaultProps = {
    ...compatIcon.defaultProps,
    weight,
  };
  return compatIcon;
}

export const Activity = withDefaultWeight(ActivityIcon);
export { ArrowLeft, ArrowRight, ArrowUpRight };
export const BadgeCheck = withDefaultWeight(SealCheck);
export const CheckCircle2 = withDefaultWeight(CheckCircle, "bold");
export const CircleAlert = withDefaultWeight(WarningCircle);
export const CircleCheck = withDefaultWeight(CheckCircle);
export { Clock as Clock3, Copy, Database, Eye, GitBranch, Link as Link2, ListChecks };
export const FilePlus2 = withDefaultWeight(FilePlus);
export const FileSearch = withDefaultWeight(FileMagnifyingGlass);
export const IdCard = withDefaultWeight(IdentificationCard);
export const Inbox = withDefaultWeight(Cards);
export const LayoutPanelLeft = withDefaultWeight(SidebarSimple);
export const LockKeyhole = withDefaultWeight(LockKey);
export const RadioTower = withDefaultWeight(Broadcast);
export const Scale = withDefaultWeight(Scales);
export const ScanSearch = withDefaultWeight(Scan);
export const Search = withDefaultWeight(MagnifyingGlass);
export const ShieldAlert = withDefaultWeight(ShieldWarning);
export { ShieldCheck };
export const Sparkles = withDefaultWeight(Sparkle);
export const TrendingUp = withDefaultWeight(TrendUp);
export const TriangleAlert = withDefaultWeight(Warning);
export { Warning as AlertTriangle };
export const WalletCards = withDefaultWeight(Cards);
export const Zap = withDefaultWeight(Lightning, "fill");
