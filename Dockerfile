FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY aivis ./aivis
ENV AIVIS_DB=/app/data/aivis.db
VOLUME /app/data
EXPOSE 8000
CMD ["python", "-m", "aivis", "serve", "--host", "0.0.0.0", "--port", "8000"]
