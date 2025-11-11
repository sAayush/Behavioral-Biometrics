from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import logging
import redis
import json
import os
import jwt
import sys
from dotenv import load_dotenv # <-- Import load_dotenv

# --- Configuration ---
project_root = os.path.realpath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.append(project_root)

# Load the .env file from the PROJECT ROOT
load_dotenv(os.path.join(project_root, '.env'))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ingestor")

# Now, read the credentials from the environment
REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = os.getenv("REDIS_PORT")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
REDIS_CHANNEL = "behavioral-stream"

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

if not JWT_SECRET:
    logger.critical("JWT_SECRET NOT SET. AUTHENTICATION WILL FAIL.")
    # In a real app, you might exit(1)


# --- NEW: Helper function to validate token ---
async def get_user_id_from_token(token: str | None) -> str | None:
    """
    Validates the JWT and returns the user ID ('sub' claim).
    Returns None if the token is invalid, expired, or missing.
    """
    if token is None:
        logger.warning("WebSocket connection attempt without a token.")
        return None
        
    try:
        # Decode the token
        # This checks signature, expiration, issuer, and audience all at once
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"], # Must match your .NET service's algorithm
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE
        )
        
        # 'sub' (Subject) is the standard JWT claim for the user's ID
        # In your .NET service, this is typically: new Claim(JwtRegisteredClaimNames.Sub, user.Id)
        user_id = payload.get('sub') 
        
        if user_id:
            logger.info(f"Token validated for user_id: {user_id}")
            return user_id
        else:
            logger.warning("Token was valid, but 'sub' (user_id) claim was missing.")
            return None
            
    except jwt.ExpiredSignatureError:
        logger.warning("WebSocket connection attempt with an EXPIRED token.")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"WebSocket connection attempt with an INVALID token: {e}")
        return None
    except Exception as e:
        logger.error(f"An unexpected error occurred during token decoding: {e}")
        return None

# --- FastAPI App ---
app = FastAPI()

@app.get("/")
def read_root():
    """ A simple health check endpoint. """
    return {"status": "Ingestor Service is running"}


@app.websocket("/ws/ingest")
async def websocket_endpoint(websocket: WebSocket, token: str | None = Query(default=None)):
    """
    The main WebSocket endpoint for ingesting behavioral data.
    """
    await websocket.accept()
    
    user_id = await get_user_id_from_token(token)
    if user_id is None:
        # Reject connection if token is invalid, expired, or missing
        logger.error("Connection rejected: Invalid or missing token.")
        await websocket.close(code=1008, reason="Invalid authentication token")
        return

    logger.info(f"Client connected and authenticated for user_id: {user_id}")
    
    if not redis_client:
        logger.error("Redis connection not available. Closing WebSocket.")
        await websocket.close(code=1011, reason="Internal server error: No Redis connection")
        return

    try:
        while True:
            data = await websocket.receive_text()
            
            try:
                data_json = json.loads(data_str)
                data_json['user_id'] = user_id
                
                enriched_data_str = json.dumps(data_json)
                
                # Publish the ENRICHED data to Redis
                redis_client.publish(REDIS_CHANNEL, enriched_data_str)
                logger.info(f"Published enriched data: {enriched_data_str}")
                
            except Exception as e:
                logger.error(f"Error publishing to Redis: {e}")
                
    except WebSocketDisconnect:
        logger.warning("Client disconnected.")
    except Exception as e:
        logger.error(f"An error occurred in WebSocket: {e}")