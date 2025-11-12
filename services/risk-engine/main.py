import sys
import os
import logging
from dotenv import load_dotenv
from pydantic import BaseModel, conlist
from typing import List

# --- Path Setup ---
# 1. Add project root to sys.path so we can import 'core'
project_root = os.path.realpath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.append(project_root)

# 2. Load the root .env file
load_dotenv(os.path.join(project_root, '.env'))

# --- Regular Imports ---
from fastapi import FastAPI, HTTPException
import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

# --- Our Project's Code ---
from core.database import SessionLocal
from core.models.BehavioralEvent import BehavioralEvent

# --- Configuration ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("risk-engine")

app = FastAPI()

# Create a folder to store our trained models
MODEL_DIR = "trained_models"
os.makedirs(MODEL_DIR, exist_ok=True)

class Event(BaseModel):
    """Defines what a single event from the frontend looks like"""
    event_type: str
    x: int | None = None
    y: int | None = None
    key: str | None = None
    timestamp: int

class PredictRequest(BaseModel):
    """Defines the list of events we expect"""
    events: conlist(Event, min_length=10) # Require at least 10 events

# --- HELPER: Feature Engineering ---
def create_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transforms raw event data into features for the AI.
    This is the "secret sauce."
    """
    logger.info(f"Creating features from {len(df)} events...")
    
    # Sort by time to be safe
    df = df.sort_values(by='timestamp')
    
    # Calculate time differences (in seconds)
    df['time_delta_s'] = df['timestamp'].diff() / 1000.0
    
    # Calculate mouse speed (pixels per second)
    df['x_delta'] = df['x'].diff().fillna(0)
    df['y_delta'] = df['y'].diff().fillna(0)
    df['distance'] = (df['x_delta']**2 + df['y_delta']**2)**0.5
    
    # Avoid division by zero
    df['speed_px_s'] = df.apply(
        lambda row: row['distance'] / row['time_delta_s'] if row['time_delta_s'] > 0 else 0,
        axis=1
    )
    
    # --- Feature Creation ---
    # We will create "sessions" of 10 events at a time
    # and calculate stats for each session.
    
    # 1. Group events into chunks of 10
    n = 10 
    df['group'] = (df.index // n)
    
    # 2. Calculate statistics for each group
    # 'agg' is a powerful pandas function
    features = df.groupby('group').agg(
        # Mouse speed features
        avg_speed=('speed_px_s', 'mean'),
        std_speed=('speed_px_s', 'std'),
        max_speed=('speed_px_s', 'max'),
        
        # Time features (how "rhythmic" is the user?)
        avg_time_delta=('time_delta_s', 'mean'),
        std_time_delta=('time_delta_s', 'std'),
        
        # Distance features
        total_distance=('distance', 'sum')
    )
    
    # Our AI model can't handle missing values ("NaN")
    features = features.fillna(0)
    
    # Remove any infinite values (from division by zero)
    features.replace([pd.NA, pd.NaT, float('inf'), -float('inf')], 0, inplace=True)

    logger.info(f"Created {len(features)} feature rows (sessions).")
    return features

# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"status": "AI Risk Engine is running"}

@app.post("/model/train/{user_id}")
async def train_model(user_id: str):
    logger.info(f"Received training request for user_id: {user_id}")
    
    # 1. Get Data from Database
    try:
        db = SessionLocal()
        query = db.query(BehavioralEvent).filter(
            BehavioralEvent.user_id == user_id,
            BehavioralEvent.event_type == 'mousemove' # Just train on mouse data for now
        )
        
        # Use pandas to read directly from the SQL query
        df = pd.read_sql(query.statement, db.bind)
        
    except Exception as e:
        logger.error(f"Database error: {e}")
        raise HTTPException(status_code=500, detail="Database connection error")
    finally:
        db.close()

    if len(df) < 50: # Need at least some data to train
        logger.warning(f"Not enough data to train for user: {user_id} (found {len(df)} events)")
        raise HTTPException(status_code=400, detail="Not enough behavioral data to train a model.")

    # 2. Feature Engineering
    try:
        features = create_features(df)
        if len(features) < 10: # Need at least 10 "sessions"
             raise Exception("Not enough feature rows after processing.")
             
    except Exception as e:
        logger.error(f"Feature engineering failed: {e}")
        raise HTTPException(status_code=500, detail=f"Feature engineering failed: {e}")

    # 3. Train the AI Model (IsolationForest)
    try:
        # IsolationForest is good at "anomaly detection"
        # contamination=0.1 means "assume 10% of the data is weird"
        model = IsolationForest(contamination=0.1, random_state=42)
        model.fit(features)
        
        logger.info("Model training complete.")
    except Exception as e:
        logger.error(f"Model training failed: {e}")
        raise HTTPException(status_code=500, detail=f"Model training failed: {e}")

    # 4. Save the Trained Model to a File
    model_path = os.path.join(MODEL_DIR, f"{user_id}_model.pkl")
    try:
        joblib.dump(model, model_path)
        logger.info(f"Model for {user_id} saved to {model_path}")
    except Exception as e:
        logger.error(f"Failed to save model: {e}")
        raise HTTPException(status_code=500, detail="Failed to save trained model.")

    return {
        "status": "training_complete",
        "user_id": user_id,
        "model_path": model_path,
        "raw_events_processed": len(df),
        "feature_rows_created": len(features)
    }