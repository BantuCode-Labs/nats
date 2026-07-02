import { getSubscriptionData } from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default async function SubscriptionPage() {
    const data = await getSubscriptionData();

    const usagePercentage =
        typeof data.monthlyLimit === "number"
            ? Math.min((data.monthlyUsage / data.monthlyLimit) * 100, 100)
            : 0;

    return (
        <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Subscription Management</h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
                        <Badge variant={data.subscription === "PREMIUM" ? "default" : "secondary"}>
                            {data.subscription}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.tenantName}</div>
                        <p className="text-muted-foreground text-xs pt-1">
                            {data.subscriptionStart && data.subscriptionEnd ? (
                                `Active from ${format(new Date(data.subscriptionStart), "PPP")} to ${format(new Date(data.subscriptionEnd), "PPP")}`
                            ) : (
                                "Lifetime or Trial"
                            )}
                        </p>
                    </CardContent>
                </Card>

                <Card className="md:col-span-1 lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Transactions Usage</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data.monthlyUsage} / {data.monthlyLimit}
                        </div>
                        {typeof data.monthlyLimit === "number" ? (
                            <div className="mt-4 flex flex-col gap-2">
                                <Progress value={usagePercentage} />
                                <p className="text-muted-foreground text-xs text-right">
                                    {usagePercentage.toFixed(1)}% used
                                </p>
                            </div>
                        ) : (
                            <p className="text-muted-foreground mt-4 text-xs">
                                You have unlimited transactions.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>Recent billing and payment transactions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.paymentHistory.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                        No payment history found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.paymentHistory.map((payment: any) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{format(new Date(payment.paymentDate), "PPP")}</TableCell>
                                        <TableCell>{payment.description || "-"}</TableCell>
                                        <TableCell>{payment.reference || "-"}</TableCell>
                                        <TableCell>
                                            <Badge variant={payment.status === "SUCCESS" ? "default" : "outline"}>
                                                {payment.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {new Intl.NumberFormat("en-US", {
                                                style: "currency",
                                                currency: "USD",
                                            }).format(payment.amount)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
