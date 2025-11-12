# Behavioral-Biometrics

A comprehensive behavioral biometrics system that captures, processes, and analyzes user interaction patterns (mouse movements, keystrokes) to build unique user profiles for authentication and fraud detection.

## 🏗️ Architecture

This project follows a microservices architecture with the following components:

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐      ┌──────────────┐
│   Client    │─────▶│   Ingestor   │─────▶│    Redis    │─────▶│ Event Logger│
│  (Browser)  │      │   Service    │      │  (Pub/Sub)  │      │   Service   │
└─────────────┘      └──────────────┘      └─────────────┘      └──────────────┘
                                                      │
                                                      ▼
                                              ┌──────────────┐
                                              │  PostgreSQL  │
                                              │  Database    │
                                              └──────────────┘
                                                      │
                                                      ▼
                                              ┌──────────────┐
                                              │ Risk Engine  │
                                              │   Service    │
                                              └──────────────┘
```

### Services Overview

1. **Identity Service** (C#/.NET) - User authentication and JWT token management
2. **Ingestor Service** (Python/FastAPI) - WebSocket endpoint for real-time behavioral data ingestion
3. **Event Logger Service** (Python) - Subscribes to Redis and persists events to PostgreSQL
4. **Risk Engine Service** (Python/FastAPI) - AI-powered anomaly detection using Isolation Forest

## 📁 Project Structure

```
Behavioral-Biometrics/
├── core/                          # Shared Python modules
│   ├── database.py                # SQLAlchemy database configuration
│   └── models/
│       └── BehavioralEvent.py     # Behavioral event data model
│
├── services/
│   ├── identity-service/          # C# .NET 10.0 authentication service
│   │   ├── controllers/
│   │   │   └── AuthController.cs  # Authentication endpoints
│   │   ├── services/
│   │   │   ├── AuthService.cs     # Authentication business logic
│   │   │   └── JwtTokenService.cs # JWT token generation/validation
│   │   ├── models/
│   │   │   └── user.cs            # User entity model
│   │   └── Program.cs             # Service entry point
│   │
│   ├── ingestor/                  # Python FastAPI WebSocket service
│   │   ├── main.py                # WebSocket endpoint for event ingestion
│   │   └── requirements.txt       # Python dependencies
│   │
│   ├── event-logger/              # Python Redis subscriber service
│   │   ├── logger.py              # Redis pub/sub subscriber
│   │   ├── requirements.txt       # Python dependencies
│   │   └── alembic/               # Database migrations
│   │
│   └── risk-engine/               # Python FastAPI ML service
│       ├── main.py                # AI model training and inference
│       └── requirements.txt      # Python dependencies
│
└── test.html                      # Test client for WebSocket connection
```

## 🚀 Getting Started

### Prerequisites

- **Python 3.8+** (for Python services)
- **.NET 10.0 SDK** (for Identity Service)
- **PostgreSQL** database
- **Redis** server (for pub/sub messaging)
- **Node.js** (optional, for frontend development)

### Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database Configuration
DB_NAME=behavioral_biometrics
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432
DB_CONNECTION_STRING=Host=localhost;Port=5432;Database=behavioral_biometrics;Username=your_db_user;Password=your_db_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key-min-32-characters
JWT_ISSUER=IdentityService
JWT_AUDIENCE=IdentityService
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
```

### Installation

#### 1. Identity Service (C#)

```bash
cd services/identity-service
dotnet restore
dotnet build
```

#### 2. Python Services

```bash
# Install dependencies for each service
cd services/ingestor
pip install -r requirements.txt

cd ../event-logger
pip install -r requirements.txt

cd ../risk-engine
pip install -r requirements.txt
```

#### 3. Database Setup

```bash
# Run migrations for event-logger
cd services/event-logger
alembic upgrade head

# Identity service uses Entity Framework migrations
cd ../identity-service
dotnet ef database update
```

## 🏃 Running the Services

### 1. Start PostgreSQL and Redis

Ensure PostgreSQL and Redis are running on your system.

### 2. Start Identity Service

```bash
cd services/identity-service
dotnet run
```

The service will be available at `https://localhost:5001` (or `http://localhost:5000`).

**API Endpoints:**
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/revoke` - Revoke refresh token
- Swagger UI available at root URL in development mode

### 3. Start Ingestor Service

```bash
cd services/ingestor
uvicorn main:app --reload --port 8000
```

The service will be available at `http://localhost:8000`.

**Endpoints:**
- `GET /` - Health check
- `WS /ws/ingest?token=<jwt_token>` - WebSocket endpoint for behavioral data ingestion

### 4. Start Event Logger Service

```bash
cd services/event-logger
python logger.py
```

This service runs continuously, subscribing to Redis and persisting events to PostgreSQL.

### 5. Start Risk Engine Service

```bash
cd services/risk-engine
uvicorn main:app --reload --port 8001
```

The service will be available at `http://localhost:8001`.

**Endpoints:**
- `GET /` - Health check
- `POST /model/train/{user_id}` - Train an anomaly detection model for a user

## 📊 Data Flow

1. **Client** captures behavioral events (mouse movements, keystrokes) and sends them via WebSocket to the **Ingestor Service**
2. **Ingestor Service** validates the JWT token, enriches events with `user_id`, and publishes to Redis
3. **Event Logger Service** subscribes to Redis and persists events to PostgreSQL
4. **Risk Engine Service** can train ML models on historical data and detect anomalies

## 🔐 Authentication Flow

1. User registers/logs in via **Identity Service** and receives a JWT token
2. Client includes the JWT token as a query parameter when connecting to the Ingestor WebSocket
3. Ingestor validates the token and extracts `user_id` from the `sub` claim
4. All behavioral events are tagged with the authenticated `user_id`

## 🤖 Machine Learning Model

The Risk Engine uses **Isolation Forest** for anomaly detection:

- **Feature Engineering**: Converts raw events into features (mouse speed, time deltas, distances)
- **Training**: Requires at least 50 events per user to train a model
- **Anomaly Detection**: Identifies behavioral patterns that deviate from the user's baseline

### Features Extracted

- Average mouse speed
- Standard deviation of speed
- Maximum speed
- Average time between events
- Standard deviation of time deltas
- Total distance traveled

## 🧪 Testing

Use the provided `test.html` file to test the WebSocket connection:

1. Open `test.html` in a browser
2. Connect to the WebSocket endpoint
3. Send mock mouse events

**Note**: You'll need to modify `test.html` to include JWT token authentication in the WebSocket URL.

## 📝 API Examples

### Register a User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

### Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

### Train Model

```bash
curl -X POST http://localhost:8001/model/train/{user_id} \
  -H "Authorization: Bearer <jwt_token>"
```

## 🛠️ Technologies Used

- **Backend Services**: Python (FastAPI), C# (.NET 10.0)
- **Database**: PostgreSQL with SQLAlchemy (Python) and Entity Framework Core (C#)
- **Message Queue**: Redis Pub/Sub
- **Authentication**: JWT (JSON Web Tokens)
- **Machine Learning**: scikit-learn (Isolation Forest)
- **Data Processing**: pandas

## 📄 License

See [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on the repository.

## AI Usage

For readme creation AI is used please correct if something is wrong.
