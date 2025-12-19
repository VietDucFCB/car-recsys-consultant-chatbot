"""
User interaction tracking endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.interaction import UserInteraction, UserFavorite, UserSearch
from app.schemas.interaction import (
    InteractionCreate,
    InteractionResponse,
    FavoriteCreate,
    FavoriteResponse,
    SearchHistoryCreate,
    SearchHistoryResponse
)

router = APIRouter()


@router.post("/track", response_model=InteractionResponse, status_code=status.HTTP_201_CREATED)
async def track_interaction(
    interaction: InteractionCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Track user interaction with a vehicle"""
    db_interaction = UserInteraction(
        user_id=UUID(user_id),
        vehicle_id=interaction.vehicle_id,
        interaction_type=interaction.interaction_type,
        session_id=interaction.session_id,
        interaction_score=interaction.interaction_score,
        extra_data=interaction.metadata
    )
    
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)
    
    return InteractionResponse.from_orm(db_interaction)


@router.get("/history", response_model=List[InteractionResponse])
async def get_interaction_history(
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(50, le=200),
    skip: int = Query(0, ge=0),
    interaction_type: str = Query(None, description="Filter by type"),
    db: Session = Depends(get_db)
):
    """Get user's interaction history"""
    query = db.query(UserInteraction).filter(UserInteraction.user_id == UUID(user_id))
    
    if interaction_type:
        query = query.filter(UserInteraction.interaction_type == interaction_type)
    
    interactions = query.order_by(UserInteraction.created_at.desc()).offset(skip).limit(limit).all()
    
    return [InteractionResponse.from_orm(i) for i in interactions]


@router.post("/favorites", response_model=FavoriteResponse, status_code=status.HTTP_201_CREATED)
async def add_favorite(
    favorite: FavoriteCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Add vehicle to favorites"""
    # Check if already favorited
    existing = db.query(UserFavorite).filter(
        UserFavorite.user_id == UUID(user_id),
        UserFavorite.vehicle_id == favorite.vehicle_id
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vehicle already in favorites"
        )
    
    db_favorite = UserFavorite(
        user_id=UUID(user_id),
        vehicle_id=favorite.vehicle_id
    )
    
    db.add(db_favorite)
    
    # Also track as interaction
    db_interaction = UserInteraction(
        user_id=UUID(user_id),
        vehicle_id=favorite.vehicle_id,
        interaction_type="favorite",
        interaction_score=5.0  # Higher score for favorites
    )
    db.add(db_interaction)
    
    db.commit()
    db.refresh(db_favorite)
    
    return FavoriteResponse.from_orm(db_favorite)


@router.get("/favorites", response_model=List[FavoriteResponse])
async def get_favorites(
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(50, le=200),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get user's favorite vehicles"""
    favorites = db.query(UserFavorite).filter(
        UserFavorite.user_id == UUID(user_id)
    ).order_by(UserFavorite.created_at.desc()).offset(skip).limit(limit).all()
    
    return [FavoriteResponse.from_orm(f) for f in favorites]


@router.delete("/favorites/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    vehicle_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Remove vehicle from favorites"""
    favorite = db.query(UserFavorite).filter(
        UserFavorite.user_id == UUID(user_id),
        UserFavorite.vehicle_id == vehicle_id
    ).first()
    
    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found"
        )
    
    db.delete(favorite)
    db.commit()
    
    return None


@router.post("/search-history", response_model=SearchHistoryResponse, status_code=status.HTTP_201_CREATED)
async def save_search(
    search: SearchHistoryCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Save user search history"""
    db_search = UserSearch(
        user_id=UUID(user_id),
        search_query=search.search_query,
        filters=search.filters,
        results_count=search.results_count
    )
    
    db.add(db_search)
    db.commit()
    db.refresh(db_search)
    
    return SearchHistoryResponse.from_orm(db_search)


@router.get("/search-history", response_model=List[SearchHistoryResponse])
async def get_search_history(
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(20, le=100),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get user's search history"""
    searches = db.query(UserSearch).filter(
        UserSearch.user_id == UUID(user_id)
    ).order_by(UserSearch.created_at.desc()).offset(skip).limit(limit).all()
    
    return [SearchHistoryResponse.from_orm(s) for s in searches]
