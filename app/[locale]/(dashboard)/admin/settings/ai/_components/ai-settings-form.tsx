"use client";

import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { saveAISettings, AISettingsInput } from "../actions";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google", "openrouter", "custom"]),
  customEndpoint: z.string().optional(),
  apiKey: z.string().optional(),
  model: z.string().min(1, "Model is required"),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(100).max(32000),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

import { useTranslations } from "next-intl";

export function AISettingsForm({ initialData }: { initialData: any }) {
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: initialData?.provider || "openai",
      customEndpoint: initialData?.customEndpoint || "",
      apiKey: initialData?.apiKey || "",
      model: initialData?.model || "gpt-4o-mini",
      temperature: initialData?.temperature ?? 0.7,
      maxTokens: initialData?.maxTokens ?? 1000,
      isActive: initialData?.isActive ?? true,
    },
  });

  const selectedProvider = useWatch({
    control,
    name: "provider",
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const result = await saveAISettings(data);
      if (result.success) {
        toast({ title: t("settings_saved") });
        router.refresh();
      } else {
        toast({
          title: tCommon("error"),
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("ai_settings_failed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("provider_settings")}</CardTitle>
          <CardDescription>{t("configure_ai_provider")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">{t("enable_ai_assistant")}</Label>
              <div className="text-sm text-muted-foreground">
                {t("enable_ai_desc")}
              </div>
            </div>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("provider")}</Label>
            <Controller
              control={control}
              name="provider"
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("select_provider")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="google">Google Gemini</SelectItem>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                    <SelectItem value="custom">
                      Custom (OpenAI Compatible)
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.provider && (
              <p className="text-sm text-red-500">{errors.provider.message}</p>
            )}
          </div>

          {selectedProvider === "custom" && (
            <div className="space-y-2">
              <Label>{t("custom_endpoint")}</Label>
              <Input
                placeholder="https://api.custom-provider.com/v1"
                {...register("customEndpoint")}
              />
              <p className="text-sm text-muted-foreground">
                {t("custom_endpoint_desc") ||
                  "Enter the base URL for the custom OpenAI-compatible API"}
              </p>
              {errors.customEndpoint && (
                <p className="text-sm text-red-500">
                  {errors.customEndpoint.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("api_key")}</Label>
            <Input
              type="password"
              placeholder={t("api_key_placeholder")}
              {...register("apiKey")}
            />
            <p className="text-sm text-muted-foreground">{t("api_key_desc")}</p>
            {errors.apiKey && (
              <p className="text-sm text-red-500">{errors.apiKey.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("model")}</Label>
            <Input placeholder="gpt-4o-mini" {...register("model")} />
            <p className="text-sm text-muted-foreground">
              e.g., gpt-4o, claude-3-5-sonnet-20240620
            </p>
            {errors.model && (
              <p className="text-sm text-red-500">{errors.model.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("generation_parameters")}</CardTitle>
          <CardDescription>{t("fine_tune_model")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("temperature")}</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="2"
              {...register("temperature", { valueAsNumber: true })}
            />
            <p className="text-sm text-muted-foreground">
              {t("temperature_desc")}
            </p>
            {errors.temperature && (
              <p className="text-sm text-red-500">
                {errors.temperature.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("max_tokens")}</Label>
            <Input
              type="number"
              {...register("maxTokens", { valueAsNumber: true })}
            />
            {errors.maxTokens && (
              <p className="text-sm text-red-500">{errors.maxTokens.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t("save_configuration")}
      </Button>
    </form>
  );
}
