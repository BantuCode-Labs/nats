import { CurrencyInput } from "@/components/ui/currency-input";
import { CustomInput } from "@/components/ui/custom-input";
import { CustomSelect } from "@/components/ui/custom-select";
import { SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Unit, TaxRate } from "@/prisma/generated/prisma/browser";
import { ProductFormState } from "../form-types";

interface PricingSectionProps {
  formData: ProductFormState;
  handleInputChange: (
    field: string,
    value: string | number | boolean | null,
  ) => void;
  units: Unit[];
  taxRates: TaxRate[];
  readonly?: boolean;
}

export function PricingSection({
  formData,
  handleInputChange,
  units,
  taxRates,
  readonly = false,
}: PricingSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="grid gap-1">
          <Label htmlFor="price" className="text-xs font-medium">
            Selling Price
          </Label>
          <CurrencyInput
            id="price"
            name="price"
            value={formData.price}
            onChange={(val) => handleInputChange("price", val)}
            placeholder="0.00"
            required
            disabled={readonly}
            className="h-8 text-sm"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="cost" className="text-xs font-medium">
            Cost Price
          </Label>
          <CurrencyInput
            id="cost"
            name="cost"
            value={formData.cost}
            onChange={(val) => handleInputChange("cost", val)}
            placeholder="0.00"
            required
            disabled={readonly}
            className="h-8 text-sm"
          />
        </div>
        <CustomInput
          label="Min Stock"
          id="minStock"
          name="minStock"
          type="number"
          min="0"
          value={formData.minStock}
          onChange={(e) => handleInputChange("minStock", e.target.value)}
          required
          disabled={readonly}
          containerClassName="grid gap-1"
          className="h-8 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 border-t pt-4">
        <CustomSelect
          label="Base Unit"
          name="baseUnitId"
          value={formData.baseUnitId}
          onValueChange={(val) => handleInputChange("baseUnitId", val)}
          disabled={readonly}
          placeholder="Select base unit"
          containerClassName="grid gap-1"
          triggerClassName="h-8 text-sm"
        >
          {units?.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name} ({u.symbol})
            </SelectItem>
          ))}
        </CustomSelect>

        <CustomSelect
          label="Tax Rate"
          name="taxRateId"
          value={formData.taxRateId || "none"}
          onValueChange={(val) =>
            handleInputChange("taxRateId", val === "none" ? null : val)
          }
          disabled={readonly}
          placeholder="Select tax rate"
          containerClassName="grid gap-1"
          triggerClassName="h-8 text-sm"
        >
          <SelectItem value="none">None</SelectItem>
          {taxRates?.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name} ({Number(r.rate)}%)
            </SelectItem>
          ))}
        </CustomSelect>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t pt-4">
        <CustomSelect
          label="Purchase Unit"
          name="purchaseUnitId"
          value={formData.purchaseUnitId}
          onValueChange={(val) => handleInputChange("purchaseUnitId", val)}
          disabled={readonly}
          placeholder="Same as Base Unit"
          containerClassName="grid gap-1"
          triggerClassName="h-8 text-sm"
        >
          {units?.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name} ({u.symbol})
            </SelectItem>
          ))}
        </CustomSelect>
        <CustomInput
          label="Purchase Factor"
          id="purchaseConversionFactor"
          name="purchaseConversionFactor"
          type="number"
          step="0.0001"
          min="0"
          value={formData.purchaseConversionFactor}
          onChange={(e) =>
            handleInputChange("purchaseConversionFactor", e.target.value)
          }
          disabled={readonly}
          containerClassName="grid gap-1"
          className="h-8 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <CustomSelect
          label="Sales Unit"
          name="salesUnitId"
          value={formData.salesUnitId}
          onValueChange={(val) => handleInputChange("salesUnitId", val)}
          disabled={readonly}
          placeholder="Same as Base Unit"
          containerClassName="grid gap-1"
          triggerClassName="h-8 text-sm"
        >
          {units?.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name} ({u.symbol})
            </SelectItem>
          ))}
        </CustomSelect>
        <CustomInput
          label="Sales Factor"
          id="salesConversionFactor"
          name="salesConversionFactor"
          type="number"
          step="0.0001"
          min="0"
          value={formData.salesConversionFactor}
          onChange={(e) =>
            handleInputChange("salesConversionFactor", e.target.value)
          }
          disabled={readonly}
          containerClassName="grid gap-1"
          className="h-8 text-sm"
        />
      </div>
    </div>
  );
}
