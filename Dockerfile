# ─── Build stage ─────────────────────────────
FROM node:20 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ─── Runtime stage ───────────────────────────
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server/index.js"]