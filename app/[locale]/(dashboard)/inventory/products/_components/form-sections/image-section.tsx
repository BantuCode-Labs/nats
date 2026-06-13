"use client";

import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/custom-input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, ImageIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { uploadFile } from "@/app/[locale]/(dashboard)/general/files/actions";
import { useAlert } from "@/hooks/use-alert";
import { ProductFormState } from "../form-types";

interface ImageSectionProps {
    formData: ProductFormState;
    handleInputChange: (
        field: string,
        value: string | number | boolean | null
    ) => void;
    readonly?: boolean;
}

export function ImageSection({
    formData,
    handleInputChange,
    readonly = false,
}: ImageSectionProps) {
    const alert = useAlert();
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const uploadData = new FormData();
        uploadData.append("file", file);

        try {
            const result = await uploadFile(uploadData);
            if (result.success && result.file) {
                handleInputChange("image", result.file.url);
            } else {
                await alert({
                    title: "Error",
                    description: result.error || "Failed to upload file",
                });
            }
        } catch (error) {
            console.error("Upload error:", error);
            await alert({
                title: "Error",
                description: "Failed to upload file",
            });
        } finally {
            setIsUploading(false);
            // Reset input
            e.target.value = "";
        }
    };

    return (
        <div className="grid gap-3">
            <div className="flex items-start gap-4">
                <div className="relative h-24 w-24 overflow-hidden rounded-md border bg-muted flex items-center justify-center flex-shrink-0">
                    {formData.image ? (
                        <Image
                            src={formData.image}
                            alt="Product image"
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                </div>
                <div className="space-y-3 flex-1">
                    <CustomInput
                        label="Image URL"
                        id="image"
                        name="image"
                        value={formData.image}
                        onChange={(e) => handleInputChange("image", e.target.value)}
                        disabled={readonly}
                        containerClassName="grid gap-1"
                        className="h-8 text-sm"
                        placeholder="https://example.com/image.jpg"
                    />
                    {!readonly && (
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="file-upload" className="text-xs font-medium">
                                Or Upload Image
                            </Label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() =>
                                        document.getElementById("file-upload")?.click()
                                    }
                                    disabled={isUploading}
                                >
                                    {isUploading ? (
                                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                    ) : (
                                        <Upload className="mr-2 h-3 w-3" />
                                    )}
                                    {isUploading ? "Uploading..." : "Select File"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
