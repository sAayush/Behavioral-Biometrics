from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import logging
import redis
import json
import os                  # <-- Import os
from dotenv import load_dotenv # <-- Import load_dotenv

# --- Configuration ---
load_dotenv() # <-- This is the magic line. It reads your .env file.

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ingestor")

# Now, read the credentials from the environment
REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = os.getenv("REDIS_PORT")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")

# Connect to your Redis Cloud instance
try:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD,
        decode_responses=True  # <-- Good practice: decodes responses from bytes to strings
    )
    redis_client.ping()
    logger.info(f"Successfully connected to Redis at {REDIS_HOST}.")
except Exception as e:
    logger.error(f"Failed to connect to Redis: {e}")
    redis_client = None

# Define the channel name we'll use for our data
REDIS_CHANNEL = "behavioral-stream"


# --- FastAPI App ---
app = FastAPI()

@app.get("/")
def read_root():
    """ A simple health check endpoint. """
    return {"status": "Ingestor Service is running"}


@app.websocket("/ws/ingest")
async def websocket_endpoint(websocket: WebSocket):
    """
    The main WebSocket endpoint for ingesting behavioral data.
    """
    await websocket.accept()
    logger.info("Client connected to WebSocket.")
    
    if not redis_client:
        logger.error("Redis connection not available. Closing WebSocket.")
        await websocket.close(code=1011, reason="Internal server error: No Redis connection")
        return

    try:
        while True:
            data = await websocket.receive_text()
            
            try:
                logger.info(f"Received data: {data}")

                # Publish the data to the Redis channel
                redis_client.publish(REDIS_CHANNEL, data)
                
            except Exception as e:
                logger.error(f"Error publishing to Redis: {e}")
                
    except WebSocketDisconnect:
        logger.warning("Client disconnected.")
    except Exception as e:
        logger.error(f"An error occurred in WebSocket: {e}")