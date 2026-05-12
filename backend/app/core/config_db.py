from threading import Lock
from typing import Any, Dict

class ConfigDBService:
    _instance = None
    _lock = Lock()
    _config: Dict[str, str] = {}

    @classmethod
    def load_from_db(cls, db_session):
        from app.crud import crud_config_store
        rows = crud_config_store.get_all(db_session)
        with cls._lock:
            cls._config = {row.key_name: row.value for row in rows}

    @classmethod
    def get(cls, key: str, default: Any = None) -> Any:
        with cls._lock:
            return cls._config.get(key, default)

    @classmethod
    def set(cls, key: str, value: str):
        with cls._lock:
            cls._config[key] = value 