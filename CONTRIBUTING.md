# Contributing to SIEM Home Lab

Thanks for taking the time to improve the project.

## Local setup

1. Copy `.env.example` to `.env` at the repository root and fill in the values.
2. Install dependencies in both app folders:
   - `cd api && npm install`
   - `cd frontend && npm install`
3. Run the app locally or with Docker Compose.

## Working guidelines

- Keep pull requests focused on one change or one feature set.
- Update the README when behavior, setup, or defaults change.
- Prefer demo-friendly changes when they improve screenshots or walkthroughs.

## Validation checklist

Before opening a pull request, make sure:

- The API source passes syntax checks.
- The frontend production build succeeds.
- Documentation is updated if user-facing behavior changed.
- New templates, config files, or workflows are committed together with the feature they support.

## Pull requests

Use the pull request template in `.github/pull_request_template.md` and include a short summary, the validation you ran, and any follow-up work.
