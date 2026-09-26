import {
  LayoutDashboard,
  NotebookPen,
  UserRound,
  Repeat,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  shortcut?: string;
};

export const navItems: NavItem[] = [
  {
    href: "/",
    label: "Панель",
    description: "Сегодняшние повторения и последние заметки",
    icon: LayoutDashboard,
    shortcut: "G D",
  },
  {
    href: "/notes",
    label: "Заметки",
    description: "Markdown-заметки и генерация вопросов",
    icon: NotebookPen,
    shortcut: "G N",
  },
  {
    href: "/review",
    label: "Повторение",
    description: "Ежедневная практика",
    icon: Repeat,
    shortcut: "G R",
  },
  {
    href: "/profile",
    label: "Прогресс",
    description: "XP, серия и достижения",
    icon: UserRound,
    shortcut: "G P",
  },
];
