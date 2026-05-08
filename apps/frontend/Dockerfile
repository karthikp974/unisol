FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm install

FROM deps AS build
COPY apps/frontend apps/frontend
RUN npm run build -w apps/frontend

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/frontend ./apps/frontend
COPY package.json ./
EXPOSE 5173
CMD ["npm", "run", "preview", "-w", "apps/frontend", "--", "--port", "5173"]
