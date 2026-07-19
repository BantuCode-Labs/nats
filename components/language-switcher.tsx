"use client";

import { usePathname, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";
import { useLocale } from "next-intl";

export function LanguageSwitcher() {
    const pathname = usePathname();
    const router = useRouter();
    const locale = useLocale();

    const switchLocale = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                    <span>{locale.toUpperCase()}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => switchLocale("en")} className="cursor-pointer" disabled={locale === "en"}>
                    English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => switchLocale("id")} className="cursor-pointer" disabled={locale === "id"}>
                    Indonesia
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => switchLocale("ms")} className="cursor-pointer" disabled={locale === "ms"}>
                    Bahasa Melayu
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => switchLocale("vi")} className="cursor-pointer" disabled={locale === "vi"}>
                    Tiếng Việt
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => switchLocale("th")} className="cursor-pointer" disabled={locale === "th"}>
                    ไทย
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => switchLocale("tl")} className="cursor-pointer" disabled={locale === "tl"}>
                    Tagalog
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
