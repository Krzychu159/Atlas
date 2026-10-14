# ATLAS — Project Instructions

@AGENTS.md

## 1. Project overview

ATLAS is a production-oriented CRM for small and medium-sized personal training studios.

The application supports three user roles:
- **Owner** — manages the studio, trainers, clients, schedules, packages, payments, expenses, settlements and statistics.
- **Trainer** — manages assigned clients, training sessions, schedules and permitted financial operations.
- **Client** — accesses their training information, packages, reservations and payments.

The application is developed in Polish and must provide a consistent, professional experience across all three portals.

ATLAS is an engineering project, but it is intended to function as a real product, not a prototype.

## 2. Technology stack

- Next.js 16 — App Router
- React 19
- TypeScript — strict typing
- Tailwind CSS v4
- ASP.NET backend — REST API
- pnpm — package manager
- Vercel — frontend deployment

Before using additional libraries, check whether the required functionality already exists in the project.

Do not upgrade dependencies or introduce new architectural patterns without a concrete reason and explicit approval.

## 3. Sources of truth

Use the following priority when making decisions:

1. Current repository code and actual implemented behavior.
2. Verified backend contracts and OpenAPI/Swagger documentation.
3. `AGENTS.md` — UX, Polish copywriting and user-facing communication.
4. `DESIGN.md` — visual language, design tokens, components and UI conventions.
5. `Zasady.txt` — additional project conventions, if available.
6. `ATLAS_PROJECT_CONTEXT.md` — project background and historical architectural context, if available.

Documentation can become outdated. When it conflicts with the actual implementation, investigate the discrepancy instead of blindly following either source.

Never invent backend capabilities, DTO fields, routes or enum values.

## 4. Architecture and code organization

Follow the existing architecture rather than introducing unnecessary abstractions.

### Next.js

- Preserve App Router conventions and existing route groups.
- Respect server/client component boundaries.
- Use `"use client"` only where client-side interactivity is required.
- Do not move business logic into presentation components unnecessarily.
- Preserve existing navigation, authentication and role-based layouts.

### API integration

- Use the existing backend communication layer.
- Keep endpoint definitions and DTO types in the appropriate domain modules under `app/lib/`.
- Do not duplicate HTTP request logic inside page components.
- Use the existing authentication and error-handling mechanisms.
- Prefer dedicated role-specific endpoints.
- Do not use Owner endpoints as a workaround for missing Trainer or Client functionality.
- Do not assume that an HTTP 200 response means all expected fields are present.

### Components

- Prefer composition over large configurable components.
- Extract shared components when there is genuine reuse.
- Keep domain-specific behavior in domain-specific modules.
- Avoid deeply nested conditional rendering.
- Do not create abstractions for hypothetical future use cases.
- Reuse existing components and helpers before adding new ones.

### TypeScript

- Prefer explicit, meaningful types.
- Avoid `any`, unsafe assertions and unnecessary non-null assertions.
- Distinguish optional, nullable and required API fields correctly.
- Keep frontend types aligned with verified backend contracts.
- Avoid silently converting unknown or missing data into misleading values.

## 5. Design system

**Read `DESIGN.md` before implementing or modifying UI.**

ATLAS follows a dark, modern visual language with a strong editorial hierarchy, restrained surfaces and deliberate use of accent colors.

Core principles:
- Consistent spacing, typography and component proportions.
- Strong visual hierarchy without unnecessary decoration.
- Prefer existing design tokens over arbitrary values.
- Use the established surface, primary, tertiary and text colors.
- Respect existing border radii, shadows and interactive states.
- Avoid introducing unrelated visual styles.
- Maintain consistency between Owner, Trainer and Client portals.
- Support desktop, tablet and mobile layouts.

The project supports studio-specific branding. Do not hardcode one studio's logo, name or accent color into shared components.

Do not redesign unrelated screens while implementing a specific feature.

When implementing a new interface, inspect comparable existing screens before creating new components.

## 6. UX and Polish language

Follow `AGENTS.md` for all user-facing language and UX communication.

Additional principles:
- User-facing content must be natural Polish.
- Technical terminology belongs in code and developer documentation, not in customer-facing messages.
- Preserve loading, empty, success and error states.
- Provide clear feedback for user actions.
- Avoid ambiguous buttons and destructive actions without confirmation.
- Maintain accessible labels, keyboard navigation and visible focus states.
- Do not expose raw backend errors to end users.

## 7. Security and authorization

ATLAS handles personal, scheduling and financial information.

Security is a priority.

- Respect Owner, Trainer and Client authorization boundaries.
- Never bypass role restrictions through alternative endpoints.
- Never expose data from another organization, location or unauthorized client.
- Treat frontend permission checks as UX improvements, not security enforcement.
- Rely on backend authorization for sensitive operations.
- Never store access tokens in `localStorage`.
- Do not log tokens, credentials or sensitive customer information.
- Preserve the existing authentication and refresh-token flow.
- Handle `401`, `403`, `404`, `409` and validation errors appropriately.
- Prevent accidental duplicate submissions of sensitive operations.
- Never modify production data without explicit authorization.

Do not weaken security to make an integration work.

## 8. Data fetching and performance

Optimize based on actual problems, not assumptions.

- Prefer backend filtering, sorting and pagination for large datasets.
- Fetch only the data needed by the current screen.
- Avoid unnecessary repeated requests.
- Prevent stale responses from overwriting newer state.
- Use cancellation or request identity checks where appropriate.
- Avoid N+1 requests when a suitable summary endpoint exists.
- Do not fetch full histories when a lightweight summary is sufficient.
- Preserve entered form data during retries and recoverable errors.
- Avoid unnecessary rerenders in large lists.
- Reuse existing caching and data-fetching patterns.
- Do not introduce another state-management or fetching library without approval.

Do not sacrifice correctness or maintainability for insignificant performance gains.

## 9. Package and billing domain

ATLAS supports different package models.

### SessionBased
Packages based on a defined number of training sessions.

### PeriodBased
Packages based on a validity period rather than a fixed session count.

Always distinguish these models in:
- UI presentation
- Validation
- Filtering
- Package usage
- Billing and payment flows
- Subscription and renewal logic

Do not display session usage such as `0/0` for a package that is not session-limited.

Financial values must come from verified backend data. Do not invent balances, payment statuses or settlement values.

Preserve existing business rules when modifying package or payment flows.

## 10. Working methodology

### Before implementation

1. Understand the requested change.
2. Inspect only the relevant parts of the codebase.
3. Identify existing patterns and reusable components.
4. Verify API contracts when integration changes are involved.
5. Present a concise implementation plan for larger tasks.

### During implementation

- Make focused, incremental changes.
- Keep diffs small and reviewable.
- Preserve existing behavior unless the task explicitly changes it.
- Do not modify unrelated modules.
- Do not remove functionality to simplify implementation.
- Do not replace working integrations with mock data.
- Do not silently work around missing backend functionality.
- Do not overwrite unrelated uncommitted user changes.
- Avoid unnecessary comments and excessive abstraction.

### Git rules

- Work on the currently selected feature branch.
- Do not switch branches without permission.
- Do not commit, push, merge, rebase or reset without explicit approval.
- Never force-push without explicit authorization.
- Check `git status` before making significant changes.
- Do not modify generated files unless necessary.

### Autonomy

You may independently:
- Read and inspect project files.
- Search existing implementations.
- Make focused code changes within the approved task.
- Run relevant local checks and tests.
- Fix errors introduced by your own changes.

Ask before:
- Expanding the scope significantly.
- Installing or upgrading dependencies.
- Changing shared architecture or authentication.
- Deleting significant functionality.
- Performing destructive operations.
- Changing backend contracts.
- Executing production operations.

Do not request approval for every small code edit once the implementation scope has been approved.

## 11. Quality assurance

After implementing changes, run the checks relevant to the affected area.

Standard commands:

- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `git diff --check`

Run focused tests where available.

Do not run a full production build unless it is necessary or explicitly requested.

Do not fix unrelated legacy warnings without approval.

Never claim that tests passed unless they were actually executed.

When visual changes are involved, verify responsiveness if browser tooling is available. Otherwise explicitly state that visual verification remains outstanding.

## 12. Communication and reporting

Communicate with the developer in Polish.

Be concise, technical and specific.

For larger tasks:
1. Briefly describe the current state.
2. Explain the proposed approach.
3. Implement after approval.
4. Report completed work and verification results.

At the end of implementation provide:
- Summary of changes.
- Important files modified.
- Tests and checks performed.
- Remaining issues or risks.
- Any backend dependencies or unverified assumptions.

Avoid lengthy explanations of obvious code.

## 13. Current development direction

The current initiative is to unify list-based interfaces in Owner Portal.

The existing Payments screen is the visual reference.

Implementation order:

1. **Packages** — replace the card grid with a compact, responsive list.
2. **Trainers** — adopt the shared list layout.
3. **Clients** — align the existing list with the common visual system.
4. **Payments** — optionally migrate to shared layout primitives without changing existing behavior.

### Shared list architecture

Prefer reusable presentation primitives such as:
- List container
- List header
- Filter toolbar
- Pagination
- Empty and loading states

Keep separate:
- Domain-specific filters
- API integrations
- DTO mapping
- Sorting and filtering rules
- Row content
- Business actions

Avoid building a generic DataTable framework with excessive configuration.

### Current priority: Packages

Focus only on the Packages screen until its implementation is reviewed and approved.

Requirements:
- Match the visual quality and density of the Payments list.
- Preserve package creation, editing and deletion.
- Preserve existing filters and sorting.
- Support SessionBased and PeriodBased.
- Keep responsive behavior.
- Avoid unnecessary backend changes.
- Do not modify Trainers or Clients yet.

Start by inspecting the actual Packages and Payments implementations before proposing changes.

Do not proceed to the next module without approval.