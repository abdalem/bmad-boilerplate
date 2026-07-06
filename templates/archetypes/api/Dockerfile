# syntax=docker/dockerfile:1.7

FROM node:24-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate

FROM base AS deps
COPY package.json ./
RUN pnpm install --prod=false

FROM base AS runner
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3333
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3333
CMD ["sh", "-c", "node ace.js serve --host=0.0.0.0 --port=${PORT}"]
