FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm install -D typescript tsx @types/node @types/express @types/cors @types/nodemailer @types/uuid
RUN npx tsc

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "dist/server.js"]