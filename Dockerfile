# ---- build frontend ----
    FROM node:20-alpine AS fe
    WORKDIR /app
    COPY package.json package-lock.json ./
    RUN npm ci
    COPY . .
    RUN npm run build
    
    # ---- run backend ----
    FROM python:3.11-slim AS be
    WORKDIR /app
    
    ENV PYTHONDONTWRITEBYTECODE=1
    ENV PYTHONUNBUFFERED=1
    
    # deps
    COPY backend/requirements.txt /app/backend/requirements.txt
    RUN pip install --no-cache-dir -r /app/backend/requirements.txt
    
    # app code
    COPY backend /app/backend
    
    # copy frontend build to /app/dist (FastAPI serves it)
    COPY --from=fe /app/dist /app/dist
    
    EXPOSE 10000
    CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "10000"]