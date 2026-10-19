#!/usr/bin/env bash
set -euo pipefail
cd /workspace/CryptoInvest
export DOCKER_CONFIG=/workspace/.cache/docker
npm ci --ignore-scripts --no-audit
npm run setup:local
npm run db:generate
npm run db:migrate
npm run db:seed
npm run build
