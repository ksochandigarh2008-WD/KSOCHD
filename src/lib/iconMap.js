import {
  Users,
  GraduationCap,
  Stethoscope,
  HeartHandshake,
  ShieldCheck,
  Scale,
  Sprout,
  Briefcase,
  BookOpen,
  Home,
  Utensils,
  Droplets,
  Sun,
  TreePine,
  PawPrint,
  Accessibility,
  Bus,
  Building2,
  Sparkles,
  Globe,
  HandHeart,
} from 'lucide-react'

/** Icons selectable in the admin editors. */
export const iconMap = {
  Users,
  GraduationCap,
  Stethoscope,
  HeartHandshake,
  ShieldCheck,
  Scale,
  Sprout,
  Briefcase,
  BookOpen,
  Home,
  Utensils,
  Droplets,
  Sun,
  TreePine,
  PawPrint,
  Accessibility,
  Bus,
  Building2,
  Sparkles,
  Globe,
  HandHeart,
}

export const iconNames = Object.keys(iconMap)

export const getIcon = (name, fallback = Sparkles) => iconMap[name] || fallback
