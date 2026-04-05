"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { Circle, Square, RectangleHorizontal, Upload, Type, Image as ImageIcon, Link, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  generateTextFavicon,
  svgToDataUrl,
  COLOR_PRESETS,
  FONT_PRESETS,
} from "@/lib/favicon-generator";
import type { FaviconConfig, GeneratedFavicon, ImageInput } from "@/lib/types";

interface FaviconStudioProps {
  config: FaviconConfig;
  onConfigChange: (config: FaviconConfig) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  generatedFavicon: GeneratedFavicon | null;
  customImage: ImageInput | null;
  onCustomImageChange: (image: ImageInput | null) => void;
}

export function FaviconStudio({
  config,
  onConfigChange,
  onGenerate,
  isGenerating,
  generatedFavicon,
  customImage,
  onCustomImageChange,
}: FaviconStudioProps) {
  const [activeTab, setActiveTab] = useState<string>(customImage ? "upload" : "text");
  const [imageUrl, setImageUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const previewSvg = useMemo(() => generateTextFavicon(config), [config]);
  const previewDataUrl = useMemo(() => svgToDataUrl(previewSvg), [previewSvg]);
  
  const currentPreviewUrl = useMemo(() => {
    if (activeTab === "upload" && customImage) {
      if (customImage.type === "svg") {
        return svgToDataUrl(customImage.data);
      }
      return `data:image/png;base64,${customImage.data}`;
    }
    return previewDataUrl;
  }, [activeTab, customImage, previewDataUrl]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const isSvg = file.type === "image/svg+xml" || file.name.endsWith(".svg");
      
      if (isSvg) {
        const svgContent = result.includes("base64,") 
          ? atob(result.split("base64,")[1])
          : result;
        onCustomImageChange({
          type: "svg",
          source: "file",
          data: svgContent,
          originalPath: file.name,
        });
      } else {
        const base64 = result.split("base64,")[1] || result;
        onCustomImageChange({
          type: file.type.includes("ico") ? "ico" : "png",
          source: "file",
          data: base64,
          originalPath: file.name,
        });
      }
    };
    
    if (file.type === "image/svg+xml" || file.name.endsWith(".svg")) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  }, [onCustomImageChange]);

  const handleUrlFetch = useCallback(async () => {
    if (!imageUrl.trim()) return;
    
    setUrlLoading(true);
    setUrlError(null);
    
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("Failed to fetch image");
      
      const contentType = response.headers.get("content-type") || "";
      const isSvg = contentType.includes("svg") || imageUrl.endsWith(".svg");
      
      if (isSvg) {
        const svgContent = await response.text();
        onCustomImageChange({
          type: "svg",
          source: "url",
          data: svgContent,
          originalPath: imageUrl,
        });
      } else {
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split("base64,")[1];
          onCustomImageChange({
            type: contentType.includes("ico") ? "ico" : "png",
            source: "url",
            data: base64,
            originalPath: imageUrl,
          });
        };
        reader.readAsDataURL(blob);
      }
      setImageUrl("");
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Failed to fetch image");
    } finally {
      setUrlLoading(false);
    }
  }, [imageUrl, onCustomImageChange]);

  const handleClearImage = useCallback(() => {
    onCustomImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onCustomImageChange]);

  const updateConfig = (updates: Partial<FaviconConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Design Your Favicon</CardTitle>
        <CardDescription>
          Create a custom favicon using text or upload your own image.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <Type className="size-4" />
              Generate from Text
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <ImageIcon className="size-4" />
              Upload Image
            </TabsTrigger>
          </TabsList>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <TabsContent value="text" className="mt-0 space-y-5">
                <FieldGroup className="gap-5">
                  <Field>
                    <FieldLabel htmlFor="text">Text / Initials</FieldLabel>
                    <Input
                      id="text"
                      value={config.text}
                      onChange={(e) => updateConfig({ text: e.target.value })}
                      placeholder="AB"
                      maxLength={2}
                      className="font-mono text-lg"
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Shape</FieldLabel>
                    <ToggleGroup
                      type="single"
                      value={config.shape}
                      onValueChange={(value) =>
                        value && updateConfig({ shape: value as FaviconConfig["shape"] })
                      }
                      className="justify-start"
                    >
                      <ToggleGroupItem value="circle" aria-label="Circle">
                        <Circle className="size-4" />
                        <span className="ml-1.5">Circle</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem value="rounded" aria-label="Rounded">
                        <RectangleHorizontal className="size-4" />
                        <span className="ml-1.5">Rounded</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem value="square" aria-label="Square">
                        <Square className="size-4" />
                        <span className="ml-1.5">Square</span>
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </Field>

                  <Field>
                    <FieldLabel>Color Preset</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() =>
                            updateConfig({
                              backgroundColor: preset.bg,
                              textColor: preset.text,
                            })
                          }
                          className="size-8 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          style={{
                            backgroundColor: preset.bg,
                            borderColor:
                              config.backgroundColor === preset.bg
                                ? "currentColor"
                                : "transparent",
                          }}
                          title={preset.name}
                          aria-label={preset.name}
                        />
                      ))}
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="bg-color">Background</FieldLabel>
                      <div className="flex gap-2">
                        <Input
                          id="bg-color"
                          type="color"
                          value={config.backgroundColor}
                          onChange={(e) =>
                            updateConfig({ backgroundColor: e.target.value })
                          }
                          className="h-9 w-12 p-1 cursor-pointer"
                        />
                        <Input
                          value={config.backgroundColor}
                          onChange={(e) =>
                            updateConfig({ backgroundColor: e.target.value })
                          }
                          className="font-mono text-xs flex-1"
                        />
                      </div>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="text-color">Text Color</FieldLabel>
                      <div className="flex gap-2">
                        <Input
                          id="text-color"
                          type="color"
                          value={config.textColor}
                          onChange={(e) => updateConfig({ textColor: e.target.value })}
                          className="h-9 w-12 p-1 cursor-pointer"
                        />
                        <Input
                          value={config.textColor}
                          onChange={(e) => updateConfig({ textColor: e.target.value })}
                          className="font-mono text-xs flex-1"
                        />
                      </div>
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel>Font</FieldLabel>
                    <Select
                      value={config.fontFamily}
                      onValueChange={(value) => updateConfig({ fontFamily: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_PRESETS.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              </TabsContent>
            
              <TabsContent value="upload" className="mt-0 space-y-5">
                <FieldGroup className="gap-5">
                  <Field>
                    <FieldLabel>Upload SVG or Image</FieldLabel>
                    <div className="space-y-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".svg,.png,.ico,.jpg,.jpeg,.webp,image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="favicon-upload"
                      />
                      <label
                        htmlFor="favicon-upload"
                        className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors"
                      >
                        <Upload className="size-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Drop SVG, PNG, or ICO here
                        </span>
                        <span className="text-xs text-muted-foreground">
                          or click to browse
                        </span>
                      </label>
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="image-url">Or paste image URL</FieldLabel>
                    <div className="flex gap-2">
                      <Input
                        id="image-url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/icon.svg"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleUrlFetch}
                        disabled={urlLoading || !imageUrl.trim()}
                      >
                        <Link className="size-4" />
                      </Button>
                    </div>
                    {urlError && (
                      <p className="text-sm text-destructive mt-1">{urlError}</p>
                    )}
                  </Field>

                  {customImage && (
                    <Field>
                      <FieldLabel>Current Image</FieldLabel>
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <div className="size-12 rounded border bg-background overflow-hidden">
                          <img
                            src={currentPreviewUrl}
                            alt="Uploaded favicon"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {customImage.originalPath || "Uploaded image"}
                          </p>
                          <p className="text-xs text-muted-foreground uppercase">
                            {customImage.type} from {customImage.source}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleClearImage}
                          className="shrink-0"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </Field>
                  )}

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      SVG files are recommended for best quality. PNG and ICO files will be 
                      used directly.
                    </p>
                  </div>
                </FieldGroup>
              </TabsContent>
            </div>

            <div className="flex flex-col items-center justify-center gap-6 p-6 rounded-lg bg-muted/50">
              <div className="flex flex-col items-center gap-2">
                <div
                  className="size-24 rounded-lg overflow-hidden shadow-lg"
                  style={{
                    background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23e5e7eb'%3E%3Crect width='8' height='8'/%3E%3Crect x='8' y='8' width='8' height='8'/%3E%3C/svg%3E")`,
                  }}
                >
                  <img
                    src={currentPreviewUrl}
                    alt="Favicon preview"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-xs text-muted-foreground">96px</span>
              </div>

              <div className="flex items-end gap-4">
                <div className="flex flex-col items-center gap-1">
                  <div className="size-8 rounded overflow-hidden shadow border bg-background">
                    <img
                      src={currentPreviewUrl}
                      alt="32px preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">32px</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="size-4 rounded-sm overflow-hidden shadow border bg-background">
                    <img
                      src={currentPreviewUrl}
                      alt="16px preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">16px</span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-t-lg border border-b-0">
                  <img
                    src={currentPreviewUrl}
                    alt="Tab preview"
                    className="size-4 object-contain"
                  />
                  <span className="text-xs truncate max-w-[100px]">Your Site</span>
                </div>
                <span className="text-xs text-muted-foreground">Browser tab</span>
              </div>
            </div>
          </div>
        </Tabs>

        <Button
          size="lg"
          onClick={onGenerate}
          disabled={isGenerating || (activeTab === "text" ? !config.text.trim() : !customImage)}
          className="w-full"
        >
          {isGenerating 
            ? "Generating..." 
            : activeTab === "upload" && customImage 
              ? "Use This Image" 
              : "Generate All Formats"
          }
        </Button>
      </CardContent>
    </Card>
  );
}
