# ---------- Frontend build ----------
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# חשוב: לדמו על אותו דומיין - VITE_API_BASE ריק
ENV VITE_API_BASE=
RUN npm run build

# ---------- Backend run ----------
FROM python:3.11-slim AS backend
WORKDIR /app

# התקנות בקאנד
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# קוד בקאנד
COPY backend /app/backend

# ה-dist מהפרונט
COPY --from=frontend /app/dist /app/dist

EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]