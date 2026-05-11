# Etapa 1: Build da aplicação
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Declara os build args para que o Vite possa usá-los no build
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_DEFAULT_ASSOCIATION_SLUG

# Exporta como variáveis de ambiente para o Vite encontrar
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_DEFAULT_ASSOCIATION_SLUG=$VITE_DEFAULT_ASSOCIATION_SLUG

RUN npm run build

# Etapa 2: Servir com Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
