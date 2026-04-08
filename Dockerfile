FROM node:24-alpine AS build

WORKDIR /app

# Install all dependencies needed to compile the TypeScript source.
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build
RUN npm prune --omit=dev && npm cache clean --force

FROM node:24-alpine AS runtime

WORKDIR /app

# Create a non-root user for the final runtime image.
RUN adduser -D mcp_user

ENV NODE_ENV=production

COPY --from=build /app/package*.json ./
COPY --from=build --chown=mcp_user:mcp_user /app/node_modules ./node_modules
COPY --from=build --chown=mcp_user:mcp_user /app/build ./build

USER mcp_user

CMD ["node", "build/index.js"]

# The following environment variables can be passed when running the container:
# - NTFY_TOPIC: Your ntfy topic name
# - NTFY_URL: Your ntfy server URL (default: https://ntfy.sh)
# - NTFY_TOKEN: Authentication token for protected topics
