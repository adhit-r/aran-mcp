# Contributing to Aran MCP Sentinel

Thank you for your interest in contributing to Aran MCP Sentinel! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)
- [Issue Guidelines](#issue-guidelines)
- [Review Process](#review-process)
- [Release Process](#release-process)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

### Our Standards

- **Be respectful** and inclusive of all contributors
- **Be collaborative** and open to feedback
- **Be constructive** in your criticism and suggestions
- **Be professional** in all interactions

## Getting Started

### Prerequisites

- **Go 1.21+** for backend development
- **Node.js 18+** for frontend development
- **Git** for version control
- **Docker** (optional) for containerized development

### Setup Development Environment

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/aran-mcp-sentinel.git
   cd aran-mcp-sentinel
   ```

2. **Set up the backend**
   ```bash
   cd backend
   go mod download
   cp configs/config.example.yaml configs/config.yaml
   # Edit configs/config.yaml with your settings
   ```

3. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   ```

4. **Start development servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   go run cmd/server/main.go

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

### Choose an Issue

1. **Browse our issue list**: [docs/ISSUE_LIST.md](docs/ISSUE_LIST.md)
2. **Look for good first issues**: Issues labeled with `good first issue`
3. **Comment on the issue** to claim it
4. **Create a feature branch** from `main`

## Development Workflow

### Branch Naming Convention

Use descriptive branch names following this pattern:
- `feature/issue-number-description` - New features
- `fix/issue-number-description` - Bug fixes
- `docs/issue-number-description` - Documentation updates
- `refactor/issue-number-description` - Code refactoring

Examples:
- `feature/123-add-user-authentication`
- `fix/456-fix-api-endpoint-error`
- `docs/789-update-readme`

### Commit Message Guidelines

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(auth): add JWT authentication system

fix(api): resolve 500 error in server status endpoint

docs(readme): update installation instructions

test(utils): add unit tests for mcp-utils functions
```

## Code Standards

### Backend (Go)

#### Code Style
- Follow [Effective Go](https://golang.org/doc/effective_go.html)
- Use `gofmt` for formatting
- Follow Go naming conventions
- Use meaningful variable and function names

#### Package Structure
```
backend/
├── cmd/server/          # Application entry point
├── internal/            # Private application code
│   ├── api/            # API handlers
│   ├── config/         # Configuration
│   ├── models/         # Data models
│   └── utils/          # Utility functions
├── pkg/                # Public packages (if any)
└── configs/            # Configuration files
```

#### Error Handling
```go
// Good
if err != nil {
    return fmt.Errorf("failed to create server: %w", err)
}

// Avoid
if err != nil {
    log.Printf("Error: %v", err)
    return err
}
```

#### Testing
- Write tests for all new functions
- Use table-driven tests for multiple scenarios
- Mock external dependencies
- Aim for >80% test coverage

### Frontend (TypeScript/React)

#### Code Style
- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Use functional components with hooks
- Prefer named exports over default exports

#### Component Structure
```typescript
// Good component structure
interface ComponentProps {
  title: string;
  onAction?: () => void;
}

export function Component({ title, onAction }: ComponentProps) {
  const [state, setState] = useState<string>('');

  const handleClick = useCallback(() => {
    onAction?.();
  }, [onAction]);

  return (
    <div>
      <h1>{title}</h1>
      <button onClick={handleClick}>Action</button>
    </div>
  );
}
```

#### State Management
- Use React Query for server state
- Use React Context for global UI state
- Keep component state local when possible
- Use `useCallback` and `useMemo` for performance

## Testing

### Backend Testing

```bash
# Run all tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run specific test
go test ./internal/mcp -v

# Run tests in watch mode (requires air)
air
```

### Frontend Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=Component.test.tsx
```

### Test Guidelines

1. **Write tests first** (TDD approach)
2. **Test edge cases** and error conditions
3. **Mock external dependencies**
4. **Use descriptive test names**
5. **Keep tests simple and focused**

Example test:
```typescript
describe('MCP Utils', () => {
  describe('discoverMcps', () => {
    it('should discover MCP servers in traffic data', async () => {
      const trafficData = 'mcp://example.com';
      const result = await discoverMcps(trafficData);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Discovered MCP Server');
    });

    it('should return empty array for non-MCP traffic', async () => {
      const trafficData = 'http://example.com';
      const result = await discoverMcps(trafficData);
      
      expect(result).toHaveLength(0);
    });
  });
});
```

## Documentation

### Code Documentation

#### Go
```go
// discoverMcps discovers MCP servers in the provided traffic data.
// It uses pattern matching to identify MCP endpoints and extracts
// relevant information about each discovered server.
//
// Parameters:
//   - trafficData: Raw traffic data as string
//
// Returns:
//   - []DiscoveredMcp: Array of discovered MCP servers
//   - error: Any error that occurred during discovery
func discoverMcps(trafficData string) ([]DiscoveredMcp, error) {
    // Implementation
}
```

#### TypeScript
```typescript
/**
 * Discovers MCP servers in traffic data using pattern matching
 * @param trafficData - Raw traffic data as string
 * @returns Promise resolving to array of discovered MCP servers
 * @throws {Error} When traffic data is invalid
 */
export async function discoverMcps(trafficData: string): Promise<DiscoveredMcp[]> {
  // Implementation
}
```

### Documentation Updates

When adding new features:
1. **Update API documentation** in `docs/API_DOCUMENTATION.md`
2. **Add JSDoc comments** to new functions
3. **Update README** if needed
4. **Create user guides** for complex features

## Submitting Changes

### Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** following code standards
3. **Write tests** for new functionality
4. **Update documentation** as needed
5. **Run all tests** and ensure they pass
6. **Commit your changes** with proper commit messages
7. **Push to your fork**
8. **Create a pull request**

### Pull Request Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added and passing
- [ ] No breaking changes (or documented)

## Related Issues
Closes #123
```

## Issue Guidelines

### Creating Issues

1. **Use the issue template** provided
2. **Provide clear description** of the problem or feature
3. **Include steps to reproduce** for bugs
4. **Add screenshots** when relevant
5. **Label appropriately** (bug, enhancement, etc.)

### Issue Templates

#### Bug Report
```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. Chrome, Firefox, Safari]
- Version: [e.g. 1.0.0]

## Additional Context
Any other context about the problem
```

#### Feature Request
```markdown
## Feature Description
Clear description of the feature

## Use Case
Why is this feature needed?

## Proposed Solution
How should this feature work?

## Alternatives Considered
Other approaches you've considered

## Additional Context
Any other context or screenshots
```

## Review Process

### Code Review Guidelines

1. **Be constructive** and respectful
2. **Focus on the code**, not the person
3. **Ask questions** rather than making assumptions
4. **Suggest improvements** with explanations
5. **Approve when satisfied** with the changes

### Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] Error handling is appropriate

### Responding to Reviews

1. **Address all comments** or explain why not
2. **Make requested changes** or discuss alternatives
3. **Request re-review** when ready
4. **Thank reviewers** for their time

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps

1. **Create release branch** from `main`
2. **Update version numbers** in relevant files
3. **Update changelog** with new features/fixes
4. **Run full test suite**
5. **Create release notes**
6. **Tag the release**
7. **Deploy to staging/production**

## Getting Help

### Questions and Support

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and community discussions
- **Discord**: For real-time chat and support
- **Email**: For private or sensitive matters

### Mentorship

New contributors can:
1. **Ask for help** in GitHub Discussions
2. **Request a mentor** for complex features
3. **Join our Discord** for real-time guidance
4. **Start with good first issues** to build confidence

## Recognition

### Contributors

We recognize contributors through:
- **GitHub contributors** page
- **Release notes** acknowledgments
- **Contributor spotlight** in our blog
- **Swag and rewards** for significant contributions

### Hall of Fame

Contributors who make significant contributions are added to our Hall of Fame with:
- Special recognition in documentation
- Contributor badge on GitHub
- Invitation to maintainer meetings
- Priority access to new features

---

Thank you for contributing to Aran MCP Sentinel! Your contributions help make MCP security better for everyone.