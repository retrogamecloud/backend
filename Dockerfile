# Dockerfile para el servicio de base de datos única de RetroGameCloud
# Usando node:20-slim en lugar de alpine para evitar problemas con bcrypt
FROM node:20.19.5-trixie-slim

WORKDIR /app

# Crear usuario no privilegiado
RUN groupadd -r nodeuser && useradd -r -g nodeuser nodeuser

COPY package*.json ./
RUN npm install --production

COPY . .

# Cambiar propiedad de archivos al usuario no privilegiado
RUN chown -R nodeuser:nodeuser /app

# Cambiar a usuario no privilegiado
USER nodeuser

EXPOSE 3000

# Usar código monolítico estable que funcionaba perfectamente
CMD ["node", "index.js"]
