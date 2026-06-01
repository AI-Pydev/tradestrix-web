# Docker & AWS ECR Guide

This guide explains how to build and push the TradeStrix Web Docker image to AWS ECR.

## Quick Start

### 1. Set AWS Credentials

```bash
export AWS_ACCOUNT_ID=your-account-id
export AWS_REGION=ap-south-1
```

### 2. Create ECR Repository (First Time Only)

```bash
# From TradeStrix root directory
bash scripts/ecr-setup.sh
```

This creates the `tradestrix-web` repository in ECR.

### 3. Build and Push Image

```bash
# From TradeStrix root directory
bash build-and-push.sh web main
```

### 4. Use in Docker Compose

```bash
export $(cat deploy/compose.env | xargs)
docker-compose up -d
```

## GitHub Actions - Automatic Push

The image is **automatically pushed to AWS ECR** via GitHub Actions when:

- **Push to `main` branch** → Image tagged as `TRADESTRIX-WEB_YYYYMMDD_HHMMSS`
- **Push git tags** (e.g., `v1.0.0`) → Versioned image with tag name
- **Manual trigger** → Commit SHA

No manual intervention needed! Just push your code.

## Image Naming

```
{AWS_ACCOUNT_ID}.dkr.ecr.{AWS_REGION}.amazonaws.com/tradestrix-web:{TAG}
```

### Tag Examples:
- `TRADESTRIX-WEB_20260503_143022` - Main branch with date & time
- `v1.0.0` - Release version
- `sha-abc1234` - Commit SHA (for other branches)

## Build Arguments

The Docker build accepts environment variables:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com \
  --build-arg NEXT_PUBLIC_BACKEND_BASE_URL=https://backend.example.com \
  --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id \
  -t tradestrix-web:dev \
  .
```

## Local Development

Build without pushing:

```bash
docker build -t tradestrix-web:dev .
docker run -p 3000:3000 tradestrix-web:dev
```

## Dockerfile

Base image: `node:20-alpine`

Key optimizations:
- Lightweight Alpine Linux
- Multi-stage build pattern (build → runtime)
- Production Next.js build
- Minimal attack surface

Build stages:
1. Install dependencies (`npm ci`)
2. Build Next.js (`npm run build`)
3. Start app (`npm run start`)

## Troubleshooting

### Build fails
```bash
docker build --progress=plain .
```

### Cannot push to ECR
- Verify AWS credentials: `aws sts get-caller-identity`
- Check ECR repo exists: `aws ecr describe-repositories --region ap-south-1`
- Re-login: `aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin {ACCOUNT_ID}.dkr.ecr.ap-south-1.amazonaws.com`

### Environment variables not loaded
- Add to `docker build` command using `--build-arg`
- Or set in GitHub Actions workflow variables
- Check `.env.production` is created during build
