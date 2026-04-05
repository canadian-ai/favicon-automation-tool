"use client";

import { useState, useCallback } from "react";
import { Zap, Github, ArrowLeft, CheckCircle2, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TokenInput } from "@/components/token-input";
import { RepoBrowser } from "@/components/repo-browser";
import { FaviconStudio } from "@/components/favicon-studio";
import { PRCreator, PRSuccess } from "@/components/pr-creator";
import { SpeedIndicator, SpeedComparison } from "@/components/speed-indicator";
import { generateAllFormats } from "@/lib/favicon-generator";
import type { BrowserOctokit } from "@/lib/github-browser";
import type {
  GitHubUser,
  Repository,
  ProjectAnalysis,
  FaviconConfig,
  GeneratedFavicon,
  FileChange,
  PRResult,
  TimingMetrics,
  ImageInput,
} from "@/lib/types";
import { DEFAULT_FAVICON_CONFIG } from "@/lib/types";

type Step = "token" | "repo" | "design" | "review" | "success";

// Helper to resize base64 images using Canvas
async function resizeBase64Image(base64: string, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      const dataUrl = canvas.toDataURL("image/png");
      const resizedBase64 = dataUrl.replace(/^data:image\/png;base64,/, "");
      resolve(resizedBase64);
    };
    
    img.onerror = () => {
      // If resize fails, return original
      resolve(base64);
    };
    
    // Try to load from base64
    img.src = `data:image/png;base64,${base64}`;
  });
}

export default function FaviconManager() {
  // State
  const [step, setStep] = useState<Step>("token");
  const [octokit, setOctokit] = useState<BrowserOctokit | null>(null);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [faviconConfig, setFaviconConfig] = useState<FaviconConfig>(DEFAULT_FAVICON_CONFIG);
  const [customImage, setCustomImage] = useState<ImageInput | null>(null);
  const [generatedFavicon, setGeneratedFavicon] = useState<GeneratedFavicon | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prResult, setPRResult] = useState<PRResult | null>(null);
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const [timing, setTiming] = useState<Partial<TimingMetrics>>({});

  // Handlers
  const handleValidToken = useCallback(
    (token: string, validatedUser: GitHubUser, client: BrowserOctokit) => {
      setOctokit(client);
      setUser(validatedUser);
      setStep("repo");
    },
    []
  );

  const handleRepoSelected = useCallback(
    (
      repo: Repository,
      projectAnalysis: ProjectAnalysis,
      repoTiming: { fetch: number; tree: number; analysis: number }
    ) => {
      setSelectedRepo(repo);
      setAnalysis(projectAnalysis);
      setTiming((t) => ({
        ...t,
        repoFetch: repoTiming.fetch,
        projectAnalysis: repoTiming.tree + repoTiming.analysis,
      }));
      
      // Pre-populate text from repo name
      const initials = repo.name
        .split(/[-_]/)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase() || "")
        .join("");
      
      setFaviconConfig((c) => ({
        ...c,
        text: initials || repo.name.substring(0, 2).toUpperCase(),
      }));
      
      setStep("design");
    },
    []
  );

  const handleGenerateFavicon = useCallback(async () => {
    setIsGenerating(true);
    const start = performance.now();
    
    try {
      if (customImage) {
        // For custom images, we need to generate proper formats
        if (customImage.type === "svg") {
          // SVG - generate all formats from it
          const [icoBase64, png32Base64, png192Base64, png512Base64] = await Promise.all([
            import("@/lib/favicon-generator").then(m => m.svgToIco(customImage.data)),
            import("@/lib/favicon-generator").then(m => m.svgToPng(customImage.data, 32)),
            import("@/lib/favicon-generator").then(m => m.svgToPng(customImage.data, 192)),
            import("@/lib/favicon-generator").then(m => m.svgToPng(customImage.data, 512)),
          ]);
          setGeneratedFavicon({
            svg: customImage.data,
            icoBase64,
            png32Base64,
            png192Base64,
            png512Base64,
          });
        } else {
          // PNG/ICO - create an SVG wrapper and use the image data
          // We'll create a minimal SVG that embeds the image as base64
          const mimeType = customImage.type === "ico" ? "image/x-icon" : "image/png";
          const wrappedSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100" width="100" height="100">
  <image width="100" height="100" xlink:href="data:${mimeType};base64,${customImage.data}"/>
</svg>`;
          
          // Also generate PNG versions from the base64 image
          const [png32Base64, png192Base64, png512Base64] = await Promise.all([
            resizeBase64Image(customImage.data, 32),
            resizeBase64Image(customImage.data, 192),
            resizeBase64Image(customImage.data, 512),
          ]);
          
          setGeneratedFavicon({
            svg: wrappedSvg,
            icoBase64: customImage.data, // Use original for ICO
            png32Base64,
            png192Base64,
            png512Base64,
          });
        }
      } else {
        const generated = await generateAllFormats(faviconConfig);
        setGeneratedFavicon(generated);
      }
      setTiming((t) => ({
        ...t,
        faviconGeneration: performance.now() - start,
      }));
      setStep("review");
    } finally {
      setIsGenerating(false);
    }
  }, [faviconConfig, customImage]);

  const handlePRCreated = useCallback(
    (result: PRResult, changes: FileChange[]) => {
      setPRResult(result);
      setFileChanges(changes);
      setTiming((t) => ({
        ...t,
        prCreation: result.timing,
        total: (t.repoFetch || 0) + (t.projectAnalysis || 0) + (t.faviconGeneration || 0) + result.timing,
      }));
      setStep("success");
    },
    []
  );

  const handleReset = useCallback(() => {
    setStep("repo");
    setSelectedRepo(null);
    setAnalysis(null);
    setGeneratedFavicon(null);
    setCustomImage(null);
    setPRResult(null);
    setFileChanges([]);
    setTiming({});
    setFaviconConfig(DEFAULT_FAVICON_CONFIG);
  }, []);

  const handleBack = useCallback(() => {
    if (step === "repo") {
      setStep("token");
      setOctokit(null);
      setUser(null);
    } else if (step === "design") {
      setStep("repo");
      setSelectedRepo(null);
      setAnalysis(null);
    } else if (step === "review") {
      setStep("design");
      setGeneratedFavicon(null);
    }
  }, [step]);

  // Render current step
  const renderStep = () => {
    switch (step) {
      case "token":
        return <TokenInput onValidToken={handleValidToken} />;
      
      case "repo":
        return octokit && user ? (
          <RepoBrowser
            octokit={octokit}
            user={user}
            onRepoSelected={handleRepoSelected}
          />
        ) : null;
      
      case "design":
        return (
          <FaviconStudio
            config={faviconConfig}
            onConfigChange={setFaviconConfig}
            onGenerate={handleGenerateFavicon}
            isGenerating={isGenerating}
            generatedFavicon={generatedFavicon}
            customImage={customImage}
            onCustomImageChange={setCustomImage}
          />
        );
      
      case "review":
        return octokit && selectedRepo && analysis && generatedFavicon ? (
          <PRCreator
            octokit={octokit}
            repo={selectedRepo}
            analysis={analysis}
            favicon={generatedFavicon}
            onPRCreated={handlePRCreated}
            onBack={handleBack}
          />
        ) : null;
      
      case "success":
        return prResult ? (
          <PRSuccess
            result={prResult}
            changes={fileChanges}
            onReset={handleReset}
          />
        ) : null;
      
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="size-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Favicon Manager</span>
            <Badge variant="secondary" className="hidden sm:flex">
              Browser-based
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="size-6 rounded-full"
                />
                <span className="hidden sm:inline">{user.login}</span>
              </div>
            )}
            {step !== "token" && step !== "success" && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="size-4 mr-1.5" />
                Back
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-center gap-2">
          <StepIndicator
            step={1}
            label="Auth"
            active={step === "token"}
            complete={step !== "token"}
          />
          <StepConnector complete={step !== "token"} />
          <StepIndicator
            step={2}
            label="Repo"
            active={step === "repo"}
            complete={["design", "review", "success"].includes(step)}
          />
          <StepConnector complete={["design", "review", "success"].includes(step)} />
          <StepIndicator
            step={3}
            label="Design"
            active={step === "design"}
            complete={["review", "success"].includes(step)}
          />
          <StepConnector complete={["review", "success"].includes(step)} />
          <StepIndicator
            step={4}
            label="PR"
            active={step === "review" || step === "success"}
            complete={step === "success"}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8 flex flex-col items-center gap-6">
        {/* Speed indicator */}
        {Object.keys(timing).length > 0 && (
          <SpeedIndicator timing={timing} />
        )}
        
        {/* Step content */}
        {renderStep()}
        
        {/* Speed comparison on success */}
        {step === "success" && timing.total && (
          <SpeedComparison totalMs={timing.total} />
        )}
      </div>

      {/* CLI Documentation Section */}
      {step === "token" && (
        <section className="container mx-auto px-4 py-8 border-t">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Terminal className="size-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">CLI for Agents</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Use the CLI for automated workflows, CI/CD pipelines, or agent-based systems. 
              Supports custom images, JSON output, and dry-run mode.
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm space-y-3">
              <div>
                <span className="text-muted-foreground"># Analyze a repository</span>
                <pre className="mt-1">npx favicon-manager analyze owner/repo --output json</pre>
              </div>
              <div>
                <span className="text-muted-foreground"># Apply custom SVG favicon</span>
                <pre className="mt-1">npx favicon-manager apply owner/repo --svg ./icon.svg</pre>
              </div>
              <div>
                <span className="text-muted-foreground"># Generate from text with custom colors</span>
                <pre className="mt-1">npx favicon-manager apply owner/repo --text &quot;AB&quot; --background &quot;#10B981&quot;</pre>
              </div>
              <div>
                <span className="text-muted-foreground"># Use image URL</span>
                <pre className="mt-1">npx favicon-manager apply owner/repo --url https://example.com/logo.png</pre>
              </div>
              <div>
                <span className="text-muted-foreground"># Dry run (preview changes)</span>
                <pre className="mt-1">npx favicon-manager apply owner/repo --svg ./icon.svg --dry-run</pre>
              </div>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline">JSON Output</Badge>
              <Badge variant="outline">Custom Images</Badge>
              <Badge variant="outline">Dry Run Mode</Badge>
              <Badge variant="outline">Agent-friendly</Badge>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-amber-500" />
              <span>
                Deterministic AST transforms - 50x faster than LLM-based tools
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Github className="size-4" />
              <span>
                100% browser-based - your token never leaves your device
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

// Step indicator component
function StepIndicator({
  step,
  label,
  active,
  complete,
}: {
  step: number;
  label: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`size-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
          complete
            ? "bg-primary text-primary-foreground"
            : active
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {complete ? <CheckCircle2 className="size-4" /> : step}
      </div>
      <span
        className={`hidden sm:inline text-sm ${
          active || complete ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function StepConnector({ complete }: { complete: boolean }) {
  return (
    <div
      className={`w-8 sm:w-12 h-0.5 ${
        complete ? "bg-primary" : "bg-muted"
      }`}
    />
  );
}
