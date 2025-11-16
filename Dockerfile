# Dockerfile para el servicio de base de datos única de RetroGameCloud
# Usando node:20-slim en lugar de alpine para evitar problemas con bcrypt
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

# Usar código monolítico estable que funcionaba perfectamente
CMD ["node", "index.js"]
