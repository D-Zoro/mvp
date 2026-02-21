## The final bet
shit started here with this and will end with this ;)

##  Tech Stack

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

##  Project Structure

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
|   |   |── repositories/
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

