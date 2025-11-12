// API utility functions for backend services

const IDENTITY_SERVICE_URL = process.env.NEXT_PUBLIC_IDENTITY_SERVICE_URL || 'http://localhost:5257';
const RISK_ENGINE_URL = process.env.NEXT_PUBLIC_RISK_ENGINE_URL || 'http://localhost:8001';

export interface RegisterRequest {
  email: string;
  password: string;
  username?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user_id: string;
  email: string;
}

export interface PredictionRequest {
  events: BehavioralEvent[];
}

export interface PredictionResponse {
  is_anomalous: boolean;
  confidence?: number;
  message?: string;
}

export interface BehavioralEvent {
  type: 'mousemove' | 'keydown' | 'click';
  timestamp: number;
  x?: number;
  y?: number;
  key?: string;
  target?: string;
}

/**
 * Register a new user
 */
export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const response = await fetch(`${IDENTITY_SERVICE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Registration failed');
  }

  return response.json();
}

/**
 * Login and get JWT token
 */
export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(`${IDENTITY_SERVICE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Login failed');
  }

  return response.json();
}

/**
 * Start training the model for a user (fire-and-forget)
 */
export function startTraining(userId: string): void {
  fetch(`${RISK_ENGINE_URL}/model/train/${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  }).catch((error) => {
    console.error('Training request failed:', error);
    // Silently fail - this is fire-and-forget
  });
}

/**
 * Predict if behavior is anomalous
 */
export async function predictAnomaly(
  userId: string,
  events: BehavioralEvent[]
): Promise<PredictionResponse> {
  const response = await fetch(`${RISK_ENGINE_URL}/model/predict/${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ events }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Prediction failed');
  }

  return response.json();
}

