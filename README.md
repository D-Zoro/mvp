# Books4All - Book Marketplace

A production-grade book marketplace platform where users can buy, sell, and discover books.

## 🚀 Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.12)
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **ORM**: SQLAlchemy 2.0
- **Authentication**: JWT with python-jose

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Environments**: Development, Staging, Production

## 📁 Project Structure

```
Books4All/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── endpoints/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── hooks/
│   ├── Dockerfile
│   └── package.json
├── docs/
│   └── ARCHITECTURE.md
├── docker-compose.dev.yml
├── docker-compose.staging.yml
├── docker-compose.prod.yml
└── README.md
```

## 🛠️ Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.12+ (for local backend development)

### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/D-Zoro/mvp.git
cd Books4All
```

2. Copy environment files:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

3. Start the development environment:
```bash
docker-compose -f docker-compose.dev.yml up --build
```

4. Access the applications:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/v1/docs

## 📚 Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)

## 🧪 Testing

### Backend
```bash
cd backend
pytest --cov=app tests/
```

### Frontend
```bash
cd frontend
npm run test
```

## 📄 License

MIT License
