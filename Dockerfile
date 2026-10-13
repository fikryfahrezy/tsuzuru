FROM oven/bun:1.4.3-debian@sha256:923bedb355f7746666659f71e724998159a5c8c54bd1cb1030e1975a0698415b AS base
WORKDIR /app

FROM base AS dependencies
ENV CI=true
COPY package.json bun.lock bunfig.toml ./
# Nuxt preparation needs the application source, which is copied below.
RUN bun install --frozen-lockfile --ignore-scripts

FROM dependencies AS build
COPY . .
RUN bun --bun nuxt prepare && bun run build

FROM base AS runtime
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
COPY --from=build --chown=bun:bun /app/.output ./.output
USER bun
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "process.exit((await fetch('http://127.0.0.1:3000/health')).ok ? 0 : 1)"
CMD ["bun", ".output/server/index.mjs"]
