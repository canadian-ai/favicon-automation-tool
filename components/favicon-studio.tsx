"use client";

import { useState, useEffect, useMemo } from "react";
import { Circle, Square, RectangleHorizontal } from "lucide-react";
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
import {
  generateTextFavicon,
  svgToDataUrl,
  COLOR_PRESETS,
  FONT_PRESETS,
} from "@/lib/favicon-generator";
import type { FaviconConfig, GeneratedFavicon } from "@/lib/types";

interface FaviconStudioProps {
  config: FaviconConfig;
  onConfigChange: (config: FaviconConfig) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  generatedFavicon: GeneratedFavicon | null;
}

export function FaviconStudio({
  config,
  onConfigChange,
  onGenerate,
  isGenerating,
  generatedFavicon,
}: FaviconStudioProps) {
  // Generate preview SVG whenever config changes
  const previewSvg = useMemo(() => generateTextFavicon(config), [config]);
  const previewDataUrl = useMemo(() => svgToDataUrl(previewSvg), [previewSvg]);

  const updateConfig = (updates: Partial<FaviconConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Design Your Favicon</CardTitle>
        <CardDescription>
          Create a custom favicon using text or initials. Changes are instant.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Controls */}
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

          {/* Right: Preview */}
          <div className="flex flex-col items-center justify-center gap-6 p-6 rounded-lg bg-muted/50">
            {/* Large preview */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="size-24 rounded-lg overflow-hidden shadow-lg"
                style={{
                  background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23e5e7eb'%3E%3Crect width='8' height='8'/%3E%3Crect x='8' y='8' width='8' height='8'/%3E%3C/svg%3E")`,
                }}
              >
                <img
                  src={previewDataUrl}
                  alt="Favicon preview"
                  className="w-full h-full"
                />
              </div>
              <span className="text-xs text-muted-foreground">96px</span>
            </div>

            {/* Size previews */}
            <div className="flex items-end gap-4">
              <div className="flex flex-col items-center gap-1">
                <div className="size-8 rounded overflow-hidden shadow border bg-background">
                  <img
                    src={previewDataUrl}
                    alt="32px preview"
                    className="w-full h-full"
                  />
                </div>
                <span className="text-xs text-muted-foreground">32px</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="size-4 rounded-sm overflow-hidden shadow border bg-background">
                  <img
                    src={previewDataUrl}
                    alt="16px preview"
                    className="w-full h-full"
                  />
                </div>
                <span className="text-xs text-muted-foreground">16px</span>
              </div>
            </div>

            {/* Browser tab mockup */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-t-lg border border-b-0">
                <img
                  src={previewDataUrl}
                  alt="Tab preview"
                  className="size-4"
                />
                <span className="text-xs truncate max-w-[100px]">Your Site</span>
              </div>
              <span className="text-xs text-muted-foreground">Browser tab</span>
            </div>
          </div>
        </div>

        <Button
          size="lg"
          onClick={onGenerate}
          disabled={isGenerating || !config.text.trim()}
          className="w-full"
        >
          {isGenerating ? "Generating..." : "Generate All Formats"}
        </Button>
      </CardContent>
    </Card>
  );
}
