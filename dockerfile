
# ---------- FRONTEND BUILD ----------
FROM node:20-alpine AS frontend-builder

WORKDIR /app
COPY ./frontend/package*.json ./
RUN npm install

COPY ./frontend .
RUN npm run build


# ---------- BACKEND ----------
FROM node:20-alpine

WORKDIR /app
COPY ./backend/package*.json ./
RUN npm install

COPY ./backend .

# copy frontend build into backend public folder
COPY --from=frontend-builder /app/dist /app/public

EXPOSE 3000

CMD ["node", "server.js"]