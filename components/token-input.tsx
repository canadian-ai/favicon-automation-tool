"use client";

import { useState, useCallback } from "react";
import { Eye, EyeOff, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  createBrowserClient,
  validateToken,
  type BrowserOctokit,
} from "@/lib/github-browser";
import type { GitHubUser } from "@/lib/types";

interface TokenInputProps {
  onValidToken: (token: string, user: GitHubUser, octokit: BrowserOctokit) => void;
  timing?: number;
}

export function TokenInput({ onValidToken, timing }: TokenInputProps) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationTime, setValidationTime] = useState<number | null>(null);

  const handleValidate = useCallback(async () => {
    if (!token.trim()) {
      setError("Please enter a token");
      return;
    }

    setIsValidating(true);
    setError(null);

    const octokit = createBrowserClient(token);
    const result = await validateToken(octokit);

    setValidationTime(result.timing);
    setIsValidating(false);

    if (result.valid && result.user) {
      onValidToken(token, result.user, octokit);
    } else {
      setError(result.error || "Invalid token");
    }
  }, [token, onValidToken]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleValidate();
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>GitHub Authentication</CardTitle>
        <CardDescription>
          Enter your Personal Access Token to get started. Your token is used
          directly in the browser and never sent to any server.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Field>
          <FieldLabel htmlFor="token">Personal Access Token</FieldLabel>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="token"
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="pr-10 font-mono"
                aria-invalid={!!error}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setShowToken(!showToken)}
                aria-label={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
            <Button
              onClick={handleValidate}
              disabled={isValidating || !token.trim()}
            >
              {isValidating ? <Spinner className="size-4" /> : "Verify"}
            </Button>
          </div>
          {error && <FieldError>{error}</FieldError>}
          <FieldDescription>
            Required scope: <code className="text-xs bg-muted px-1 py-0.5 rounded">repo</code>{" "}
            (Full control of private repositories)
          </FieldDescription>
        </Field>

        <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="size-4 text-green-600" />
            <span>Token stays in your browser only</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="size-4 text-green-600" />
            <span>Direct API calls to GitHub</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="size-4 text-green-600" />
            <span>Cleared when you leave the page</span>
          </div>
        </div>

        <a
          href="https://github.com/settings/tokens/new?scopes=repo&description=Favicon%20Manager"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline underline-offset-4"
        >
          Create a new token
          <ExternalLink className="size-3.5" />
        </a>

        {validationTime !== null && (
          <div className="text-xs text-muted-foreground">
            Validated in {validationTime.toFixed(0)}ms
          </div>
        )}
      </CardContent>
    </Card>
  );
}
