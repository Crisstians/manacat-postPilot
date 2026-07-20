import type { LucideIcon } from "lucide-react";
import { Briefcase, Megaphone, Package } from "lucide-react";

export type PostTypeId = "product" | "shop" | "hiring";

export interface PostTypeDefinition {
  id: PostTypeId;
  label: string;
  description: string;
  icon: LucideIcon;
  accentClass: string;
}

export const POST_TYPES: PostTypeDefinition[] = [
  {
    id: "product",
    label: "Promovare produs",
    description: "Graphic complet cu nume, preț, poză și caracteristici pentru produse din magazin.",
    icon: Package,
    accentClass: "home-card-product",
  },
  {
    id: "shop",
    label: "Anunț magazin",
    description: "Program special, reduceri, evenimente sau informări generale pentru clienți.",
    icon: Megaphone,
    accentClass: "home-card-shop",
  },
  {
    id: "hiring",
    label: "Anunț angajări",
    description: "Postări pentru recrutare cu titlu job, cerințe și date de contact.",
    icon: Briefcase,
    accentClass: "home-card-hiring",
  },
];

export const getPostTypeDefinition = (id: PostTypeId): PostTypeDefinition =>
  POST_TYPES.find((type) => type.id === id) ?? POST_TYPES[0]!;

export type AnnouncementPostType = Exclude<PostTypeId, "product">;
