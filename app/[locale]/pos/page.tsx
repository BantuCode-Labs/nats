import {
  getOpenPOSSession,
  getPOSProducts,
  getPOSCategories,
  getWarehouses,
  getPOSDepartments,
} from "./actions";
import { POSSessionDialog } from "./_components/pos-session-dialog";
import { LogoutButton } from "./_components/logout-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { POSView } from "./_components/pos-view";
import { getTranslations } from "next-intl/server";

export default async function POSPage() {
  const t = await getTranslations("POS");
  const session = await getOpenPOSSession();
  const products = await getPOSProducts();
  const categories = await getPOSCategories();
  const warehouses = await getWarehouses();
  const departments = await getPOSDepartments();

  if (!session) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">{t("open_session")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/20">
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <p className="text-center text-muted-foreground">
                {t("need_session")}
              </p>
              <div className="flex w-full flex-col gap-2">
                <POSSessionDialog warehouses={warehouses} departments={departments} />
                <LogoutButton variant="outline" className="w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-muted/20">
      <POSView
        initialProducts={products}
        categories={categories}
        session={session}
      />
    </div>
  );
}
