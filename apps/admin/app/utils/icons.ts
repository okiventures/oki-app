import {
  Droplets,
  Zap,
  Wrench,
  Sparkles,
  Paintbrush,
  Thermometer,
  Home,
  Leaf,
  Settings,
  Hammer,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

export const SERVICE_CATEGORY_ICON: Record<string, LucideIcon> = {
  Plumbing: Droplets,
  Electrical: Zap,
  Carpentry: Wrench,
  Cleaning: Sparkles,
  Painting: Paintbrush,
  HVAC: Thermometer,
  Roofing: Home,
  Landscaping: Leaf,
  "Appliance Repair": Settings,
  "General Handyman": Hammer,
};

export function getServiceIcon(category: string): LucideIcon {
  return SERVICE_CATEGORY_ICON[category] || HelpCircle;
}
