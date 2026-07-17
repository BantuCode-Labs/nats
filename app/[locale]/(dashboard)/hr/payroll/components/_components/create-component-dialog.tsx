"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { createSalaryComponent } from "../../actions";
import { useToast } from "@/hooks/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Protect } from "@/components/ui/protect";

export function CreateComponentDialog() {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [type, setType] = useState<"EARNING" | "DEDUCTION">("EARNING");
    const [isTaxable, setIsTaxable] = useState(true);
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setLoading(true);
        try {
            const result = await createSalaryComponent({
                name,
                type,
                isTaxable,
                description,
            });

            if (result.success) {
                toast({
                    title: "Success",
                    description: "Salary component created successfully",
                });
                setOpen(false);
                setName("");
                setIsTaxable(true);
                setDescription("");
            } else {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Something went wrong",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Protect permission="payroll.configure">
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> New Component
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>New Salary Component</DialogTitle>
                    <DialogDescription>
                        Create a new earning or deduction component.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Basic Salary, House Allowance"
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Type</Label>
                        <Select
                            value={type}
                            onValueChange={(val: "EARNING" | "DEDUCTION") => setType(val)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EARNING">Earning</SelectItem>
                                <SelectItem value="DEDUCTION">Deduction</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="taxable"
                            checked={isTaxable}
                            onCheckedChange={(checked) => setIsTaxable(checked as boolean)}
                        />
                        <Label htmlFor="taxable">Taxable Component</Label>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="desc">Description</Label>
                        <Input
                            id="desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create Component"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
        </Protect>
    );
}
