# Dockerfile para el servicio de base de datos única de RetroGameCloud
FROM node:20-alpine

WORKDIR /app

COPY . .
RUN npm install --production

EXPOSE 3000

CMD ["node", "index.js"]
