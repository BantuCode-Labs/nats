"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-primary/10 p-6 animate-in fade-in zoom-in duration-500">
            <FileQuestion className="h-24 w-24 text-primary" />
          </div>
        </div>
        <h1 className="mt-4 text-6xl font-extrabold tracking-tight text-foreground sm:text-7xl animate-in slide-in-from-top duration-500 delay-150">
          404
        </h1>
        <p className="mt-6 text-2xl font-semibold text-foreground animate-in slide-in-from-top duration-500 delay-300">
          {t("title")}
        </p>
        <p className="mt-4 text-muted-foreground max-w-md mx-auto animate-in slide-in-from-top duration-500 delay-500">
          {t("description")}
        </p>
        <div className="mt-10 animate-in fade-in duration-700 delay-700">
          <Button
            asChild
            size="lg"
            className="px-8 shadow-lg hover:shadow-xl transition-all"
          >
            <Link href="/dashboard" className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              {t("back_to_dashboard")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
