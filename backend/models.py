from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, Float, JSON
from database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    file_type = Column(String, default="text")
    word_count = Column(Integer, default=0)
    char_count = Column(Integer, default=0)
    summary = Column(Text, nullable=True)
    keywords = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class QueryHistory(Base):
    __tablename__ = "query_history"

    id = Column(String, primary_key=True)
    query = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    intent = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    sources = Column(JSON, default=list)
    workflow_steps = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
