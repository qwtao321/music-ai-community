FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV CLOUDBASE_ENV_ID=oscar-d1gv01qxw0d7f0ec4
ENV CLOUDBASE_REGION=ap-shanghai
ENV NEXT_PUBLIC_CLOUDBASE_ENV_ID=oscar-d1gv01qxw0d7f0ec4
ENV NEXT_PUBLIC_CLOUDBASE_REGION=ap-shanghai
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV CLOUDBASE_ENV_ID=oscar-d1gv01qxw0d7f0ec4
ENV CLOUDBASE_REGION=ap-shanghai
ENV NEXT_PUBLIC_CLOUDBASE_ENV_ID=oscar-d1gv01qxw0d7f0ec4
ENV NEXT_PUBLIC_CLOUDBASE_REGION=ap-shanghai

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm", "start"]
