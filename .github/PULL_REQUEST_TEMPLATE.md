# Pull Request

<!--
  PR Title Format: Follow commit message conventions
  Examples:
    - feat: Add malicious dependency detection
    - fix: Resolve database connection timeout
    - docs: Update API documentation
    - refactor: Extract scan workflow logic
-->

## Description

<!-- Provide a clear and concise description of what this PR does -->

### Related Issue

<!-- Link to the issue this PR addresses -->

Closes #(issue number)

<!-- If this PR addresses multiple issues, list them:
- Closes #123
- Fixes #456
- Resolves #789
-->

## Type of Change

<!-- Check the relevant option(s) -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Code refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Test additions or updates
- [ ] Build/CI configuration change
- [ ] Other (please describe):

## Changes Made

<!-- Provide a detailed list of changes made in this PR -->

-
-
-

## Testing Done

<!-- Describe the tests you ran to verify your changes -->

### Test Environment

- **OS**:
- **Node.js Version**:
- **Browser** (if applicable):

### Test Cases

<!-- Describe what you tested -->

- [ ] Tested locally with `npm run dev`
- [ ] Ran test suite with `npm test`
- [ ] Ran linting checks with `npm run lint`
- [ ] Verified code formatting with `npm run format:check`
- [ ] Verified no new TypeScript errors with `npm run type-check`
- [ ] Tested edge cases and error handling
- [ ] Tested with different user scenarios
- [ ] Other:

**Note:** Git hooks should have automatically run lint and format checks on commit. If you bypassed hooks, please run these manually.

### Test Results

<!-- Describe the results of your testing -->

## Screenshots/Videos

<!-- If applicable, add screenshots or videos to demonstrate the changes -->

## Breaking Changes

<!-- If this PR introduces breaking changes, describe them here and provide migration instructions -->

N/A

## Additional Notes

<!-- Add any additional context, concerns, or information reviewers should know -->

---

## Pre-Submission Checklist

<!-- Please check all items before submitting your PR -->

### Code Quality

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings or errors
- [ ] I have checked for and resolved any merge conflicts

### Testing

- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes (`npm test`)
- [ ] I have tested my changes with `npm run dev` locally
- [ ] I have run `npm run lint` and resolved all linting issues
- [ ] I have run `npm run format:check` and code is properly formatted
- [ ] I have run `npm run type-check` and resolved all TypeScript errors

### Documentation

- [ ] I have updated relevant documentation (README.md, CONTRIBUTING.md, docs/API.md, docs/ARCHITECTURE.md, docs/DEVELOPMENT.md, etc.)
- [ ] I have updated JSDoc comments for new or modified functions
- [ ] I have added or updated examples if needed

### Best Practices

- [ ] I have followed the guidelines in [CONTRIBUTING.md](../CONTRIBUTING.md)
- [ ] I have checked the [SECURITY.md](../SECURITY.md) guidelines and ensured no security issues
- [ ] I have run `npm audit` to check for dependency vulnerabilities
- [ ] I have verified that sensitive data (API keys, credentials) is not exposed
- [ ] My commit messages follow the project's commit message conventions

---

**Additional Information for Reviewers:**

<!-- Add any specific guidance for reviewers, areas you want extra attention on, or known limitations -->
