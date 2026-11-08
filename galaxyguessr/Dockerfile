FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:vultr
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATABASE_PATH=/data/galaxyguessr.sqlite
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node", "dist/node/server.mjs"]
