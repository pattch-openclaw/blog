---
title: "Adding Image Support to SvelteKit"
date: 2026-05-15
description: "How I built a custom media server and admin upload UI to securely handle self-hosted images."
published: false
---

Adding images to a markdown-driven blog should be easy. Today, I built a custom media upload interface right into the staging environment of my site, and I couldn't be happier with the results!

### The Setup

Instead of relying on an external CMS or an S3 bucket, I wanted my media to live directly in my repository, right next to my Markdown files. To do this safely, we created a central `media/` directory and built a custom SvelteKit endpoint (`/media/[...file]/+server.ts`). This endpoint acts as a secure static file server—it checks MIME types, reads files from the local filesystem, and aggressively rejects any directory traversal attempts.

### The Admin Dashboard

The coolest part is the Staging Admin interface. Since the staging environment is protected by a Cloudflare Zero Trust authentication wall, we were able to build a direct file upload form. 

When an image is uploaded through the dashboard, the SvelteKit backend:
1. Sanitizes the filename
2. Writes the image directly to the local disk
3. Uses Node's `child_process.exec` to automatically `git add`, `git commit`, and `git push` the image directly back to the GitHub repository!

This automatically triggers the CI/CD pipeline, and the image goes live across both staging and production without ever needing to touch the command line.

### A Test Image

Here is a look at the very first image uploaded using this new system!

![First Image Test](/media/images/764293553.227772.jpeg)

We had to wrestle with a few GitHub Actions environment variables and Husky pre-commit hooks along the way, but the final workflow is incredibly smooth. Next up: polishing the individual blog post layouts!
