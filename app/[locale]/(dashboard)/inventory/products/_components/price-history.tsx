import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormatCurrency } from "@/hooks/use-format-currency";
import { useFormatDate } from "@/hooks/use-format-date";

import { Decimal } from "decimal.js";

interface PriceHistoryProps {
  history?: {
    id: string;
    price: number | Decimal;
    effectiveDate: Date;
  }[];
}

export function PriceHistory({ history }: PriceHistoryProps) {
  const formatCurrency = useFormatCurrency();
  const formatDate = useFormatDate();

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-none border">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-bold">Price History</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="h-8 text-xs">Date</TableHead>
              <TableHead className="h-8 text-xs text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((entry) => (
              <TableRow key={entry.id} className="hover:bg-muted/50">
                <TableCell className="py-2 text-xs">
                  {formatDate(entry.effectiveDate, { includeTime: true })}
                </TableCell>
                <TableCell className="py-2 text-xs text-right font-medium">
                  {formatCurrency(entry.price)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
