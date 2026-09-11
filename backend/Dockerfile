FROM node:22-alpine AS builder

WORKDIR /app

# Install build tools for native modules
RUN apk add --no-cache python3 make g++

# Copy workspace root
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/

# Copy backend package
COPY backend/package.json ./backend/

# Install all workspace deps
RUN npm install

# Copy source
COPY shared/ ./shared/
COPY backend/ ./backend/
COPY shared/src ./shared/src

# Build shared first, then backend
RUN cd shared && npm run build
RUN cd backend && npm run build

# ── Production image ──────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache tini

# Copy workspace
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

# Install production deps only
RUN npm ci --omit=dev

# Copy built output
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/backend/package.json ./backend/

USER node

EXPOSE 3001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "backend/dist/index.js"]
