import redis
import os
import logging
from dotenv import load_dotenv

# --- Configuration ---
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("event-logger")

# Get Redis credentials
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
            decode_responses=True # <-- Important!
        )
        redis_client.ping()
        logger.info(f"Successfully connected to Redis at {REDIS_HOST}.")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        return # Exit if we can't connect

    # --- Subscribe to the Channel ---
    # This is the core logic
    pubsub = redis_client.pubsub()
    pubsub.subscribe(REDIS_CHANNEL)
    logger.info(f"Subscribed to Redis channel: {REDIS_CHANNEL}")
    logger.info("Waiting for messages...")

    # --- Listen for Messages ---
    # This loop will run forever, blocking until a new message arrives.
    try:
        for message in pubsub.listen():
            # Check if the message is the right type
            if message['type'] == 'message':
                data = message['data']
                
                # FOR NOW: Just print the data we received.
                # LATER: This is where we will save to Postgres.
                logger.info(f"Received data: {data}")

    except KeyboardInterrupt:
        logger.info("Shutting down logger...")
    except Exception as e:
        logger.error(f"An error occurred: {e}")
    finally:
        pubsub.unsubscribe()
        pubsub.close()
        logger.info("Unsubscribed and disconnected from Redis.")

# This makes the script runnable
if __name__ == "__main__":
    main()