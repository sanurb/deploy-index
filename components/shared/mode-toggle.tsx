"use client";

import { Laptop, Moon, Sun } from "lucide-react";
import { motion } from "motion/react";
import { type Theme, useTheme } from "@/components/theme-provider";
import { useMounted } from "@/hooks/use-mounted";
import { cn } from "@/lib/utils";

type ThemeType = {
  name: Theme;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
};

const themes: ThemeType[] = [
  {
    name: "light",
    icon: Sun,
  },
  {
    name: "dark",
    icon: Moon,
  },
  {
    name: "system",
    icon: Laptop,
  },
];

const ThemeSwitcher = () => {
  const { setTheme, theme: justTheme } = useTheme();
  const mouted = useMounted();

  if (!mouted) return;

  return (
    <div className="!z-[999] fixed bottom-0 left-0 hidden items-center gap-2 rounded-tr-xl border border-b-0 border-l-0 bg-muted/40 p-1 md:flex">
      {themes.map((theme, index) => {
        // something
        return (
          <button
            className={cn(
              "relative flex size-6 items-center justify-center outline-none ring-0"
            )}
            key={index + theme.name}
            onClick={() => setTheme(theme.name)}
          >
            <span className="sr-only">{theme.name}</span>
            <theme.icon className="size-4" />
            {justTheme === theme.name && (
              <motion.div
                className="absolute -z-10 size-full rounded-md bg-muted"
                layoutId="selected-theme"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ThemeSwitcher;
