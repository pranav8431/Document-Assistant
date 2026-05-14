from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    gemini_api_key: str
    database_url: str = "sqlite+aiosqlite:///./documents.db"
    chunk_size: int = 500
    chunk_overlap: int = 50
    top_k_chunks: int = 5
    embedding_model: str = "models/gemini-embedding-001"
    generation_model: str = "gemini-3-flash-preview"

    class Config:
        env_file = ".env"


settings = Settings()
