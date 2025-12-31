FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Copy game data (from submodule) to dist
RUN cp -r game-data/data dist/ && \
    cp -r game-data/unit_images dist/ && \
    cp -r game-data/unit_ascii dist/ && \
    cp -r game-data/rules dist/

FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
