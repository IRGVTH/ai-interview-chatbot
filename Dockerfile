FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl
RUN npm install -g pnpm@11.24.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile --prod=false
# Client generation reads Prisma config but does not connect to a database.
# Use a build-only placeholder instead of production credentials.
RUN DATABASE_URL=postgresql://unused:unused@127.0.0.1:5432/build_only pnpm deploy:api:build

EXPOSE 4000

CMD ["pnpm", "deploy:api:start"]


