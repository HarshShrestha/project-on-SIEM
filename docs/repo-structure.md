# Repository Structure

This project is split into a small number of focused areas:

- `api/` contains the Node.js service that talks to Wazuh and serves the dashboard data.
- `frontend/` contains the React single-page app, UI components, and demo-mode data.
- `nginx/` contains the reverse proxy configuration for local and Docker deployments.
- `scripts/` contains environment and host setup helpers.
- `wazuh/` contains custom Wazuh rules.

## GitHub-ready files

- `.github/workflows/ci.yml` validates the API syntax and frontend build.
- `.github/pull_request_template.md` keeps pull requests consistent.
- `.github/ISSUE_TEMPLATE/` provides bug and feature request forms.
- `CONTRIBUTING.md` describes the expected workflow for changes.
