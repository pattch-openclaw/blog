# Sam's Personal Blog

A simple, personal blog project built with SvelteKit.

## Overview
This repository contains the source code for my personal blog. It serves as a place to share thoughts, projects, and updates, leveraging SvelteKit for a fast and clean developer experience.

## Setup & Running Locally

1. Install dependencies (if you haven't already):
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser.

## Self-Hosting Deployment Guide

This blog is configured to be self-hosted using `@sveltejs/adapter-node`, deployed via a GitHub Actions Self-Hosted Runner, managed by PM2, and served securely via Cloudflare Tunnels.

### Prerequisites (On your home server)
1. **Node.js** (v18+)
2. **PM2** installed globally (`npm install -g pm2`)
3. **cloudflared** installed

### Step 1: Set Up the GitHub Actions Self-Hosted Runner
1. Go to this repository on GitHub -> **Settings** -> **Actions** -> **Runners**.
2. Click **New self-hosted runner**.
3. Select the OS and Architecture of your home server.
4. SSH into your home server, download the runner, and configure it using the commands GitHub provides.
5. Run the installation as a background service: 
   ```bash
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```

### Step 2: Configure PM2
We use an `ecosystem.config.cjs` file in this repository. Once the runner pulls the code for the first time, PM2 will manage the SvelteKit node process.

Start the app for the first time manually (after running `npm install` and `npm run build`):
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup # Follow the instructions it outputs to run PM2 on boot
```

### Step 3: Serve Externally with Cloudflare Tunnels
Cloudflare Tunnels expose your local PM2 service (running on port 3000) securely without opening router ports.

1. Go to your Cloudflare Dashboard -> **Zero Trust** -> **Networks** -> **Tunnels**.
2. Click **Create a tunnel**. Name it (e.g., `sams-blog`).
3. Follow the instructions to install the connector on your home server.
4. Route the traffic:
   - **Public Hostname**: `blog.yourdomain.com` (or whatever domain you have configured).
   - **Service**: `http://localhost:3000` (The default port for adapter-node).
5. Save the tunnel. Your blog is now live to the world with automatic SSL.

Every time a commit is pushed to the `main` branch, the self-hosted runner will automatically pull the changes, rebuild the site, and restart the PM2 instance seamlessly!
