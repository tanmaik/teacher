# syntax=docker/dockerfile:1.7

FROM python:3.11-slim-bullseye AS base

ENV POETRY_VIRTUALENVS_CREATE=false \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    git \
    graphviz \
    libcairo2-dev \
    libffi-dev \
    libgl1 \
    libgstreamer1.0-0 \
    libjpeg-dev \
    libopenblas-dev \
    libpango1.0-dev \
    libssl-dev \
    libbz2-dev \
    liblzma-dev \
    zlib1g-dev \
    pkg-config \
    texlive \
    texlive-latex-extra \
    texlive-fonts-extra \
    texlive-science \
    dvipng \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8000

ENV MANIM_OUTPUT_DIR=/data/outputs

RUN mkdir -p "$MANIM_OUTPUT_DIR"

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}


