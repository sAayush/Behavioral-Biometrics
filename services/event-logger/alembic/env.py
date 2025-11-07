from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

import sys
import os
from dotenv import load_dotenv

# ----------------- YOUR CUSTOM CODE STARTS HERE -----------------

# 1. DEFINE config FIRST
# This is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# 2. NOW, load .env and set options
project_root = os.path.realpath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.append(project_root)

# Load the .env file from the event-logger directory
load_dotenv(os.path.join(project_root, '.env'))
# Add .env variables to the config so alembic.ini can read them
config.set_main_option('DB_USER', os.getenv('DB_USER') or '')
config.set_main_option('DB_PASSWORD', os.getenv('DB_PASSWORD') or '')
config.set_main_option('DB_HOST', os.getenv('DB_HOST') or '')
config.set_main_option('DB_PORT', os.getenv('DB_PORT') or '')
config.set_main_option('DB_NAME', os.getenv('DB_NAME') or '')

# 3. Import your models
from core.database import Base
import core.models.BehavioralEvent
# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
