FROM node:22-alpine

WORKDIR /app

# Install backend deps
COPY package*.json ./
RUN npm ci --production

# Copy backend
COPY server/ ./server/
COPY scripts/ ./scripts/
COPY data/ ./data/

# Install and build frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Copy config
COPY .env.example .env.example

EXPOSE 3096

CMD ["node", "server/api.mjs"]
