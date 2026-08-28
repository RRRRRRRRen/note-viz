import {
  Braces,
  Database,
  Globe,
  Palette,
  Rocket,
  Server,
  Smartphone,
  TestTube2,
  Workflow,
  Gauge,
  Layers,
  Package,
  ShieldCheck,
  Accessibility,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Globe,
  Server,
  Database,
  Braces,
  Palette,
  Rocket,
  Smartphone,
  TestTube2,
  Workflow,
  Gauge,
  Layers,
  Package,
  ShieldCheck,
  Accessibility,
};

export function taxonomyIcon(name: string | undefined): LucideIcon {
  if (name && ICONS[name]) return ICONS[name]!;
  return Globe;
}
