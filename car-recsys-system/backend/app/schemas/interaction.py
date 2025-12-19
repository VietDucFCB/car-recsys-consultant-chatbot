"""
User interaction schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID


class InteractionCreate(BaseModel):
    vehicle_id: str
    interaction_type: str = Field(..., description="Type: view, click, favorite, compare, contact")
    session_id: Optional[str] = None
    interaction_score: Optional[float] = 1.0
    metadata: Optional[Dict[str, Any]] = None


class InteractionResponse(BaseModel):
    id: int
    user_id: UUID
    vehicle_id: str
    interaction_type: str
    interaction_score: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


class FavoriteCreate(BaseModel):
    vehicle_id: str


class FavoriteResponse(BaseModel):
    id: int
    user_id: UUID
    vehicle_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class SearchHistoryCreate(BaseModel):
    search_query: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    results_count: Optional[int] = None


class SearchHistoryResponse(BaseModel):
    id: int
    user_id: UUID
    search_query: Optional[str]
    filters: Optional[Dict[str, Any]]
    results_count: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

