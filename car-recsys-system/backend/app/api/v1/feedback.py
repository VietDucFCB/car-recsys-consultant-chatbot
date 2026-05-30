"""
Feedback and user interaction endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.interaction import UserInteraction
from app.models.vehicle import Vehicle
from app.schemas.interaction import InteractionCreate, InteractionResponse
from app.schemas.vehicle import VehicleResponse

router = APIRouter()


@router.post("/feedback", response_model=InteractionResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    interaction: InteractionCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Submit user interaction feedback"""
    # Create interaction record
    db_interaction = UserInteraction(
        user_id=user_id,
        vehicle_id=interaction.vehicle_id,
        interaction_type=interaction.interaction_type,
        session_id=interaction.session_id,
        extra_data=interaction.metadata
    )
    
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)
    
    return InteractionResponse.from_orm(db_interaction)


@router.get("/favorites", response_model=List[VehicleResponse])
async def get_favorites(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get user favorites"""
    # Get all favorite interactions
    favorite_interactions = db.query(UserInteraction).filter(
        UserInteraction.user_id == user_id,
        UserInteraction.interaction_type == "favorite"
    ).all()
    
    # Get unique vehicle IDs
    vehicle_ids = list(set([int(i.vehicle_id) for i in favorite_interactions]))
    
    # Fetch vehicles
    vehicles = db.query(Vehicle).filter(Vehicle.id.in_(vehicle_ids)).all()
    
    return [VehicleResponse.from_orm(v) for v in vehicles]


@router.post("/favorites/{vehicle_id}", status_code=status.HTTP_201_CREATED)
async def add_to_favorites(
    vehicle_id: int,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Add vehicle to favorites"""
    # Check if already favorited
    existing = db.query(UserInteraction).filter(
        UserInteraction.user_id == user_id,
        UserInteraction.vehicle_id == str(vehicle_id),
        UserInteraction.interaction_type == "favorite"
    ).first()
    
    if existing:
        return {"message": "Already in favorites", "vehicle_id": vehicle_id}
    
    # Create favorite interaction
    interaction = UserInteraction(
        user_id=user_id,
        vehicle_id=str(vehicle_id),
        interaction_type="favorite",
        interaction_score=2.0
    )
    
    db.add(interaction)
    db.commit()
    
    return {"message": "Added to favorites", "vehicle_id": vehicle_id}


@router.delete("/favorites/{vehicle_id}", status_code=status.HTTP_200_OK)
async def remove_from_favorites(
    vehicle_id: int,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Remove vehicle from favorites"""
    # Find and delete favorite interaction
    deleted_count = db.query(UserInteraction).filter(
        UserInteraction.user_id == user_id,
        UserInteraction.vehicle_id == str(vehicle_id),
        UserInteraction.interaction_type == "favorite"
    ).delete()
    
    db.commit()
    
    if deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found"
        )
    
    return {"message": "Removed from favorites", "vehicle_id": vehicle_id}
