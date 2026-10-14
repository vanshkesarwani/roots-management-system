## Description
Please include a summary of the change and which issue or requirement it addresses.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Business Rules & Technical Checklist
- [ ] Employee ID and Email normalization & uniqueness constraints preserved
- [ ] Max 3 active tasks capacity limit verified
- [ ] Task status state machine strictly enforced
- [ ] Overdue task calculations verified across list, detail, dashboard, and CSV
- [ ] CSV Export conforms to RFC 4180 and protects against formula injection
- [ ] URL synchronization with query params tested with browser Back/Forward

## Testing
- [ ] Backend Jest test suites passing (`npm run test:backend`)
- [ ] Frontend Vitest test suites passing (`npm run test:frontend`)
- [ ] Oxlint checks passing (`npm run lint`)
- [ ] Production build succeeds (`npm run build`)
