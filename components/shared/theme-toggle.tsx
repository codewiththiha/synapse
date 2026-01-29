"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="text-xs">
        <Sun size={14} className="mr-2" />
        Theme
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-xs"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <>
          <Sun size={14} className="mr-2" />
          Light
        </>
      ) : (
        <>
          <Moon size={14} className="mr-2" />
          Dark
        </>
      )}
    </Button>
  );
}
