FROM node:20-alpine

WORKDIR /app

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_BACKEND_BASE_URL

COPY package*.json ./
RUN npm ci

COPY . .

RUN if [ -n "$NEXT_PUBLIC_API_BASE_URL" ]; then echo "NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL" >> .env.production; fi \
 && if [ -n "$NEXT_PUBLIC_BACKEND_BASE_URL" ]; then echo "NEXT_PUBLIC_BACKEND_BASE_URL=$NEXT_PUBLIC_BACKEND_BASE_URL" >> .env.production; fi

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
