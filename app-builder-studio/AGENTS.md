<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Verification data flows through src/lib/verification.ts (mock checks), src/lib/scoring.ts (decision policy, no numeric thresholds/weights until the backend supplies them) and src/lib/repository.ts (storage, browser-local for now) — so each can be swapped for the Python/SQLite backend independently.
- Dashboard and results routes use ssr:false because submissions currently live in browser storage.
