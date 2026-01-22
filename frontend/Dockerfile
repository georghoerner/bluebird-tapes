FROM node:22-alpine AS builder

# Install canvas dependencies for ASCII art generation
RUN apk add --no-cache \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    python3 \
    make \
    g++

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Generate ASCII art from unit images, then build
RUN npx tsx scripts/ascii-batch-generator/index.ts \
    --input game-data/unit_images \
    --output public/unit_ascii && \
    npm run build

# Copy game data (from submodule) to dist
RUN cp -r game-data/data dist/ && \
    cp -r game-data/unit_images dist/ && \
    cp -r game-data/rules dist/

FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
