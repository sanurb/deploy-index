# Refactor Code

## Overview

Refactor the selected code to improve its quality while maintaining the same functionality. **MUST comply with** the project's clean code standards defined in `.cursor/rules/clean-code.mdc` and TypeScript standards in `.cursor/rules/typescript-usage-rule.mdc`.

Primary goal: Minimize time-to-understand while maintaining correctness and safety.

## Required Standards

This refactoring **MUST** follow these rule files:
- `.cursor/rules/clean-code.mdc` - Clean code guidelines and principles
- `.cursor/rules/typescript-usage-rule.mdc` - TypeScript-specific standards

## Refactoring Process

### 1. Correctness and Explicitness
- [ ] Make all assumptions explicit (types, invariants, contracts, boundaries)
- [ ] Eliminate hidden coupling (implicit globals, invisible side effects)
- [ ] Ensure every function is explainable: inputs, outputs, invariants, side effects, error cases
- [ ] Model uncertainty explicitly in types (nullability, Result/Either, Option)
- [ ] Validate inputs at module boundaries

### 2. Type Safety (TypeScript)
- [ ] Use explicit types for function parameters and return values
- [ ] Prefer `interface` over `type` for object shapes
- [ ] Avoid `any`; use `unknown`, `never`, or generics
- [ ] Use `import type` for type-only imports
- [ ] Mark data structures as `readonly` by default
- [ ] Prefer explicit `T | undefined` over optional (`?`) props
- [ ] Use discriminated unions for finite state modeling
- [ ] All control paths must be explicit (no fallthroughs)

### 3. Naming and Constants (A1, A2)
- [ ] Replace magic numbers/literals with named constants
- [ ] Use meaningful, unambiguous names that reveal purpose
- [ ] Avoid empty words: data, info, manager, handler, stuff
- [ ] Encode units in names: `*_MS`, `*_SECONDS`, `*_BYTES`
- [ ] Encode risk when unavoidable: `UNSAFE_*` prefix
- [ ] Avoid negated booleans (prefer `isEnabled` over `isNotDisabled`)

### 4. Control Flow (A3)
- [ ] Nesting depth MUST NOT exceed 2 per function body
- [ ] Use guard clauses and early returns to reduce nesting
- [ ] Avoid `switch`; use lookup tables or strategy maps
- [ ] Functions MUST NOT rely on implicit undefined (explicit returns)
- [ ] Group declarations into responsibility blocks

### 5. Expressions and Variables (A4, A5)
- [ ] One idea per line, one concern per statement
- [ ] Extract explaining variables for long/complex expressions
- [ ] NO nested ternaries
- [ ] Rewrite complex boolean expressions into named predicates
- [ ] Variables have minimal scope
- [ ] Prefer `const`; use `let` only when it reduces complexity
- [ ] Variables SHOULD be assigned once (split if meaning changes)
- [ ] No shadowing

### 6. Functions (A7)
- [ ] Each function has one purpose (describable in one sentence without "and")
- [ ] Max 3 positional parameters (use options object if more)
- [ ] Side effects visible in name or signature (`save*`, `write*`, `send*`, `mutate*`)
- [ ] Extract helpers when internal section comments are needed

### 7. DRY with Discipline (A8)
- [ ] Remove true duplication that increases bug probability
- [ ] Do NOT abstract purely to reduce line count
- [ ] Apply rule of three unless duplication is actively dangerous
- [ ] Abstractions MUST reduce cognitive load and preserve locality

### 8. Structure and Layering (A9)
- [ ] Related code MUST be co-located
- [ ] Glue code at edges (framework, DB, HTTP)
- [ ] Domain logic free of infrastructure details
- [ ] Prefer composition over inheritance
- [ ] Use function composition, closures, or object literals over class hierarchies

### 9. API Design (A10)
- [ ] Implementation details hidden behind stable interfaces
- [ ] APIs hard to misuse (validate inputs, avoid boolean parameter traps)
- [ ] Errors MUST be: typed/categorized, contextual, actionable, non-leaky
- [ ] Use options objects or enums instead of boolean parameters

### 10. Performance (A11)
- [ ] Do napkin math before optimizing
- [ ] NO unbounded loops or unbounded memory growth
- [ ] State complexity in code review for non-trivial paths
- [ ] Choose data structures that preserve readability and correctness

### 11. Comments (A6)
- [ ] Comments explain WHY, not WHAT
- [ ] Comment non-obvious constraints, counter-intuitive decisions, invariants
- [ ] Do NOT comment obvious code or compensate for vague naming
- [ ] Module headers for non-trivial modules (responsibility, boundaries, invariants)
- [ ] Public API contracts documented (inputs, outputs, errors, side effects)

### 12. Code Organization
- [ ] Imports organized: built-in → external → internal → parent → sibling → index → object → type
- [ ] Imports sorted alphabetically within groups
- [ ] Blank lines between import groups
- [ ] No duplicate or circular imports
- [ ] Use `const` by default, `let` only when needed
- [ ] Use template literals over string concatenation
- [ ] Use optional chaining (`?.`) and nullish coalescing (`??`) appropriately

### 13. Error Handling
- [ ] Errors are typed or categorized
- [ ] Errors include context (who/what/where)
- [ ] Errors are actionable (how to remediate)
- [ ] Errors do NOT expose secrets
- [ ] Use try-catch meaningfully (don't catch just to rethrow)

## Output Requirements

After refactoring, provide:
1. **Refactored code** with all improvements applied
2. **Explanation** of each improvement made, referencing specific rules
3. **Verification** that functionality remains unchanged
4. **Type safety confirmation** (no TypeScript errors or warnings)

## Notes

- Optimize for **reading** and **changing**, not just writing
- Don't be clever. Be clear.
- Treat all TypeScript warnings as failures
- Zero technical debt policy: do it right the first time