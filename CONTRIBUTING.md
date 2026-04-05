# Contributing to Favicon Manager

Thank you for your interest in contributing to Favicon Manager! This document provides guidelines and information for contributors.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Use the bug report template when creating new issues
3. Include:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node.js version, etc.)

### Suggesting Features

1. Open an issue with the "feature request" label
2. Describe the use case and expected behavior
3. Explain why this would benefit other users

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes following our coding standards
4. Write or update tests as needed
5. Run the test suite: `npm test`
6. Commit with clear messages: `git commit -m "feat: add new feature"`
7. Push to your fork: `git push origin feature/your-feature`
8. Open a Pull Request

## Development Setup

```bash
# Clone the repository
git clone https://github.com/canadian-ai/favicon-automation-tool.git
cd favicon-automation-tool

# Install dependencies
bun install
# or
npm install

# Run development server (web UI)
bun dev

# Run CLI in development
bun cli analyze owner/repo --token <token>
```

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Prefer explicit types over `any`
- Document public functions with JSDoc comments
- Use meaningful variable and function names

### Security

- **Never** commit secrets, tokens, or credentials
- Sanitize all user inputs
- Validate URLs before fetching
- Follow the security guidelines in `SECURITY.md`

### Code Style

- Use 2-space indentation
- Use single quotes for strings
- Add trailing commas in multi-line structures
- Keep functions small and focused

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --grep "security"

# Run with coverage
npm run test:coverage
```

### Test Guidelines

- Write unit tests for utility functions
- Write integration tests for CLI commands
- Mock external APIs (GitHub, image fetching)
- Test edge cases and error handling

## Architecture Overview

```
/lib               Core libraries (browser-compatible)
  /types.ts        TypeScript type definitions
  /security.ts     Security utilities (sanitization, validation)
  /favicon-generator.ts  Browser-based favicon generation
  /project-detector.ts   Next.js project analysis
  /ast-transformer.ts    Code transformation with Recast

/cli               CLI implementation (Node.js)
  /index.ts        Main CLI entry point
  /github-node.ts  GitHub API client
  /image-processor.ts  Image processing with Sharp

/app               Next.js web application
/components        React components
```

## Security Contributions

Security issues require special handling:

1. **Do NOT** open public issues for security vulnerabilities
2. Email security@canadian.ai with details
3. See `SECURITY.md` for our security policy

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for new functions
- Update CLI help text for new commands/options
- Include examples in documentation

## Release Process

Releases are managed by maintainers:

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create a release tag
4. Publish to npm

## Getting Help

- Open a Discussion for questions
- Join our Discord (link in README)
- Check existing issues and discussions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Favicon Manager!
