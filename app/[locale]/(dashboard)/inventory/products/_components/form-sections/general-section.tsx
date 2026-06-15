import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { CustomTextarea } from "@/components/ui/custom-textarea";
import { SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Category } from "@/prisma/generated/prisma/browser";
import { ProductFormState } from "../form-types";

interface GeneralSectionProps {
  formData: ProductFormState;
  handleInputChange: (
    field: string,
    value: string | number | boolean | null,
  ) => void;
  categories: Category[];
  readonly?: boolean;
  onOpenSkuSearch?: () => void;
}

export function GeneralSection({
  formData,
  handleInputChange,
  categories,
  readonly = false,
  onOpenSkuSearch,
}: GeneralSectionProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1">
          <Label htmlFor="sku">SKU</Label>
          <div className="flex gap-1.5">
            <Input
              id="sku"
              name="sku"
              value={formData.sku}
              onChange={(e) => handleInputChange("sku", e.target.value)}
              required
              disabled={readonly}
              className="h-8 text-sm flex-1"
            />
            {!readonly && onOpenSkuSearch && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={onOpenSkuSearch}
                title="Search product info by SKU"
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <CustomInput
          label="Name"
          id="name"
          name="name"
          value={formData.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
          required
          disabled={readonly}
          containerClassName="grid gap-1"
          className="h-8 text-sm"
        />
      </div>

      <CustomTextarea
        label="Description"
        id="description"
        name="description"
        value={formData.description}
        onChange={(e) => handleInputChange("description", e.target.value)}
        disabled={readonly}
        containerClassName="grid gap-1"
        className="min-h-[60px] text-sm"
      />

      <div className="grid grid-cols-2 gap-3">
        <CustomSelect
          label="Category"
          name="categoryId"
          value={formData.categoryId}
          onValueChange={(val) => handleInputChange("categoryId", val)}
          disabled={readonly}
          placeholder="Select category"
          containerClassName="grid gap-1"
          triggerClassName="h-8 text-sm"
        >
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </CustomSelect>
        <div className="flex items-center space-x-2 h-full pt-6">
          <Switch
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onCheckedChange={(val) => handleInputChange("isActive", val)}
            disabled={readonly}
            className="scale-75 origin-left"
          />
          <Label htmlFor="isActive" className="text-sm">
            Active Status
          </Label>
        </div>
      </div>
    </div>
  );
}
