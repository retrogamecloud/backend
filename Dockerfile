# Dockerfile para el servicio de base de datos única de RetroGameCloud
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

# Usar código refactorizado que tiene 85.71% de cobertura
CMD ["node", "index.wrapper.js"]
