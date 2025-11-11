import sys
import os
from dotenv import load_dotenv

# --- Path Setup ---
# 1. Add project root to sys.path so we can import 'core'
project_root = os.path.realpath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.append(project_root)

# 2. Load the root .env file
load_dotenv(os.path.join(project_root, '.env'))

# --- Now, regular imports ---
import redis
import logging
import json

# --- Our project's code ---
from core.database import SessionLocal  # Import our session maker
from core.models.BehavioralEvent import BehavioralEvent # Import our model

# --- Configuration ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("event-logger")

# --- Redis Config (from .env) ---
REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = os.getenv("REDIS_PORT")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
REDIS_CHANNEL = "behavioral-stream"

def main():
    logger.info("Starting Event Logger service...")

    # --- Connect to Redis ---
    try:
        redis_client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            password=REDIS_PASSWORD,
            decode_responses=True
        )
        redis_client.ping()
        logger.info(f"Successfully connected to Redis at {REDIS_HOST}.")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        return # Exit if we can't connect

    # --- Subscribe to the Channel ---
    pubsub = redis_client.pubsub()
    pubsub.subscribe(REDIS_CHANNEL)
    logger.info(f"Subscribed to Redis channel: {REDIS_CHANNEL}")
    logger.info("Waiting for messages...")

    # --- Get a database session ---
    # We create one session and use it for the lifetime of the script
    try:
        db = SessionLocal()
        logger.info("Database session created.")
    except Exception as e:
        logger.error(f"Failed to create database session: {e}. Check DB connection and credentials.")
        return

    # --- Listen for Messages ---
    try:
        for message in pubsub.listen():
            if message['type'] == 'message':
                data_str = message['data']
                logger.info(f"Received data: {data_str}")
                
                try:
                    # 1. Parse the JSON string
                    event_data = json.loads(data_str)
                    
                    # 2. Create a model instance (The new ORM way)
                    new_event = BehavioralEvent(
                        event_type=event_data.get('type'),
                        x=event_data.get('x'),
                        y=event_data.get('y'),
                        key=event_data.get('key'),
                        timestamp=event_data.get('timestamp')
                        user_id=event_data.get('user_id')
                        # 'received_at' will be set by the DB default
                    )
                    
                    # 3. Add to the session and commit
                    db.add(new_event)
                    db.commit()
                    logger.info("Successfully saved event to database.")
                    
                except json.JSONDecodeError:
                    logger.error(f"Could not decode JSON: {data_str}")
                    db.rollback() # Rollback on error
                except Exception as e:
                    logger.error(f"Database error: {e}")
                    db.rollback() # Rollback on error

    except KeyboardInterrupt:
        logger.info("Shutting down logger...")
    except Exception as e:
        logger.error(f"An error occurred: {e}")
    finally:
        pubsub.unsubscribe()
        pubsub.close()
        db.close() # Close the session
        logger.info("Disconnected from Redis and closed DB session.")

if __name__ == "__main__":
    main()