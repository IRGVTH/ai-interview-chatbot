FROM node:22.13-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@11.24.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter api build

EXPOSE 4000
CMD ["sh", "-c", "pnpm --filter api start:prod"]
