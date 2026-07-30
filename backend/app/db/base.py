"""SQLAlchemy declarative base — the parent class all ORM models inherit from.

Import Base in models.py and use it to define your database tables.
SQLAlchemy uses this base to track metadata about all models.
"""

from sqlalchemy.orm import declarative_base

Base = declarative_base()
