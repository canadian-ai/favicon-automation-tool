# Favicon Manager

> Fast, deterministic favicon management for Next.js projects. Made open source by [Canadian AI](https://canadian.ai).

[![npm version](https://img.shields.io/npm/v/@canadianai/favicon-manager.svg)](https://www.npmjs.com/package/@canadianai/favicon-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Add or update favicons in any Next.js project in seconds. Automatically detects project structure, generates optimized multi-resolution favicons, and creates a pull request - all from your terminal or browser.

## Features

- **50x Faster Than LLM-Based Tools** - Deterministic AST transforms instead of probabilistic AI
- **Multi-Resolution Support** - Generates all standard sizes (16px to 512px) for all devices
- **Automatic Project Detection** - Supports App Router, Pages Router, and hybrid projects
- **Secure by Default** - SVG sanitization, URL validation, SSRF protection
- **Agent-Friendly** - JSON output, dry-run mode, exit codes for CI/CD
- **Browser-Based UI** - Web interface with real-time preview

## Quick Start

### Using bunx (Recommended)

```bash
# Analyze a repository
bunx @canadianai/favicon-manager analyze owner/repo

# Add favicon from SVG
bunx @canadianai/favicon-manager apply owner/repo --svg ./icon.svg

# Generate from text/initials
bunx @canadianai/favicon-manager apply owner/repo --text "CA" --background "#3B82F6"
```

### Using npx

```bash
npx @canadianai/favicon-manager analyze owner/repo
npx @canadianai/favicon-manager apply owner/repo --svg ./icon.svg
```

### Global Installation

```bash
npm install -g @canadianai/favicon-manager
favicon-manager analyze owner/repo
```

## Commands

### `analyze` - Inspect Repository

Analyze a Next.js project structure to understand where favicons should be placed.

```bash
favicon-manager analyze owner/repo [options]

Options:
  -t, --token <token>    GitHub Personal Access Token (or GITHUB_TOKEN env)
  -b, --branch <branch>  Branch to analyze (defaults to default branch)
  -o, --output <format>  Output format: json or text (default: text)
  -v, --verbose          Show detailed timing information
```

Example output:

```
Project Analysis:
----------------------------------------
  Type:              app-router
  Has Favicon:       No
  Layout File:       app/layout.tsx
  
Recommended Favicon Paths:
  SVG:  app/icon.svg
  ICO:  app/favicon.ico
  PNG:  app/icon.png
```

### `apply` - Add/Update Favicon

Add or update favicon in a repository with automatic PR creation.

```bash
favicon-manager apply owner/repo [options]

Image Source (choose one):
  -i, --image <path>     Path to image file (PNG, ICO, JPG, WebP)
  -s, --svg <path>       Path to SVG file
  -u, --url <url>        URL to remote image
  --text <text>          Generate from text/initials (1-2 chars)

Text Generation Options:
  --background <color>   Background color (default: #3B82F6)
  --color <color>        Text color (default: #FFFFFF)
  --shape <shape>        Shape: circle, square, rounded (default: rounded)

Other Options:
  -t, --token <token>    GitHub Personal Access Token
  -b, --branch <branch>  Base branch (defaults to default branch)
  -o, --output <format>  Output format: json or text
  -d, --dry-run          Preview changes without creating PR
  -v, --verbose          Show detailed information
  --title <title>        Custom PR title
  --body <body>          Custom PR body
```

### `list` - List Repositories

List accessible repositories.

```bash
favicon-manager list [options]

Options:
  -t, --token <token>    GitHub Personal Access Token
  -o, --output <format>  Output format: json or text
  -n, --limit <number>   Maximum repositories to list (default: 20)
```

## Multi-Resolution Favicon Support

Favicon Manager generates optimized favicons for all standard sizes:

| Size | Use Case |
|------|----------|
| 16x16 | Classic browser favicon |
| 32x32 | Modern browsers, taskbar |
| 48x48 | Windows site icon |
| 64x64 | Windows high DPI |
| 128x128 | Chrome Web Store |
| 180x180 | Apple Touch Icon |
| 192x192 | Android Chrome |
| 256x256 | Windows 8/10 tile |
| 512x512 | PWA splash screen |

## Authentication

### Environment Variable (Recommended)

```bash
export GITHUB_TOKEN=ghp_your_token_here
favicon-manager analyze owner/repo
```

### Command Line

```bash
favicon-manager analyze owner/repo --token ghp_your_token_here
```

### Required Token Permissions

- `repo` - For private repositories
- `public_repo` - For public repositories only

Create a token at: https://github.com/settings/tokens

## JSON Output for Automation

Use `--output json` for machine-readable output:

```bash
favicon-manager apply owner/repo --svg ./icon.svg --output json
```

```json
{
  "success": true,
  "timing": {
    "total": 1234,
    "steps": {
      "tokenValidation": 150,
      "treeFetch": 200,
      "analysis": 15,
      "imageProcessing": 100,
      "astTransform": 50,
      "prCreation": 700
    }
  },
  "analysis": {
    "type": "app-router",
    "hasExistingFavicon": false
  },
  "changes": [
    { "path": "app/icon.svg", "action": "create" },
    { "path": "app/favicon.ico", "action": "create" }
  ],
  "pr": {
    "url": "https://github.com/owner/repo/pull/123",
    "number": 123
  }
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Add Favicon

on:
  workflow_dispatch:
    inputs:
      svg_path:
        description: 'Path to SVG file'
        required: true

jobs:
  add-favicon:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Add favicon
        run: |
          npx @canadianai/favicon-manager apply ${{ github.repository }} \
            --svg ${{ inputs.svg_path }} \
            --output json
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Dry Run in CI

```bash
# Preview changes without creating PR
favicon-manager apply owner/repo --svg ./icon.svg --dry-run --output json
```

## Web UI

The package also includes a web-based interface for interactive favicon management.

```bash
# Clone and run locally
git clone https://github.com/canadian-ai/favicon-automation-tool.git
cd favicon-automation-tool
bun install
bun dev
```

## Security

Favicon Manager includes multiple security features:

- **SVG Sanitization** - Removes script tags, event handlers, and dangerous elements
- **URL Validation** - Prevents SSRF attacks by blocking internal/private IPs
- **Input Validation** - Validates all user inputs (colors, text, repo names)
- **Token Format Validation** - Checks GitHub token format before use
- **File Size Limits** - Prevents DoS via large files (10MB images, 1MB SVGs)

See [SECURITY.md](SECURITY.md) for our security policy and how to report vulnerabilities.

## Architecture

```
@canadianai/favicon-manager
├── /cli                    # CLI implementation
│   ├── index.ts           # Main entry point
│   ├── github-node.ts     # GitHub API client
│   └── image-processor.ts # Sharp-based image processing
├── /lib                   # Core libraries
│   ├── security.ts        # Security utilities
│   ├── types.ts           # TypeScript definitions
│   ├── project-detector.ts # Next.js detection
│   └── ast-transformer.ts # Code transformation
└── /app                   # Web UI (Next.js)
```

## Performance

| Operation | Time |
|-----------|------|
| Token validation | ~150ms |
| Repository analysis | ~15ms |
| Image processing | ~100ms |
| AST transformation | ~50ms |
| PR creation | ~700ms |
| **Total** | **~1-2 seconds** |

Compare to LLM-based tools: 15-25 seconds.

## Requirements

- Node.js 18.0.0 or higher
- GitHub Personal Access Token

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Credits

Made open source by [Canadian AI](https://canadian.ai).

Built with:
- [Sharp](https://sharp.pixelplumbing.com/) - High-performance image processing
- [Recast](https://github.com/benjamn/recast) - JavaScript AST transformation
- [Octokit](https://github.com/octokit/octokit.js) - GitHub API client
- [Commander](https://github.com/tj/commander.js) - CLI framework

## Support

- [Open an issue](https://github.com/canadian-ai/favicon-automation-tool/issues)
- [Discussions](https://github.com/canadian-ai/favicon-automation-tool/discussions)
- Email: support@canadian.ai
