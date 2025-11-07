import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

load_dotenv()

# Get DB credentials from .env
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")

# This is the connection string, like in Django's settings
SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# The "engine" is the main connection point
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# This creates a "Session" class, which we will use
# to interact with the database in our logger.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# This is the base class our models will inherit from
Base = declarative_base()