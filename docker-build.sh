#!/bin/bash

# Script para construir y desplegar localmente los contenedores Docker

set -e

echo "🏗️  Construyendo imágenes Docker..."

# Construir backend
echo "📦 Construyendo backend..."
docker-compose build backend

# Construir frontend
echo "📦 Construyendo frontend..."
docker-compose build frontend

echo "✅ Imágenes construidas exitosamente"
echo "🚀 Iniciando contenedores..."

# Iniciar contenedores
docker-compose up -d

echo "✨ Contenedores iniciados"
echo ""
echo "🌐 Aplicación disponible en:"
echo "   Frontend: http://localhost"
echo "   Backend:  http://localhost:3000"
echo ""
echo "📊 Para ver logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Para detener:"
echo "   docker-compose down"
