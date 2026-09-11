---
name: Artifact worker paths
description: How to keep auxiliary inference workers locatable across Replit artifact development and production runs.
---

Artifact services may start with different working directories between development and production. Resolve auxiliary worker scripts from both the workspace-root path and the artifact-local path instead of assuming one current directory.

**Why:** A Python inference worker can otherwise stay unavailable even though its runtime and model are installed correctly.

**How to apply:** For child processes launched by a managed artifact service, check candidate paths with filesystem existence checks before spawning, and surface startup failures as structured API errors.