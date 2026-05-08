FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/backend/package.json apps/backend/package.json
RUN npm install

FROM deps AS build
COPY apps/backend apps/backend
RUN npm run prisma:generate -w apps/backend
RUN npm run build -w apps/backend

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/backend ./apps/backend
COPY package.json ./
EXPOSE 4000
CMD ["npm", "run", "start", "-w", "apps/backend"]
