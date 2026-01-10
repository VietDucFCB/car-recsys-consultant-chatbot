"""
Recommendation endpoints - Item-based Collaborative Filtering
Provides personalized vehicle recommendations based on user behavior
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
import logging

from app.core.database import get_db
from app.core.security import get_current_user_id_optional
from app.services.recommendation_engine import RecommendationEngine
from app.schemas.vehicle import (
    VehicleListItem,
    RecommendationItem,
    RecommendationResponse
)

router = APIRouter()
logger = logging.getLogger(__name__)

# Global recommendation engine instance (lazy initialization)
_recommendation_engine: Optional[RecommendationEngine] = None


def get_recommendation_engine(db: Session) -> RecommendationEngine:
    """Get or create recommendation engine instance"""
    global _recommendation_engine
    if _recommendation_engine is None:
        _recommendation_engine = RecommendationEngine(db)
        try:
            _recommendation_engine.fit(days_lookback=90)
        except Exception as e:
            logger.warning(f"Failed to fit recommendation engine: {e}")
    return _recommendation_engine


def _fetch_vehicle_details(db: Session, vehicle_ids: List[str]) -> dict:
    """Fetch vehicle details for a list of IDs"""
    if not vehicle_ids:
        return {}
    
    query = text("""
        SELECT 
            v.vehicle_id,
            v.title,
            v.brand,
            v.car_model,
            v.price,
            v.mileage_str,
            v.fuel_type,
            v.transmission,
            v.exterior_color,
            v.car_rating,
            v.vehicle_url,
            v.condition,
            COALESCE(
                (SELECT image_url FROM raw.vehicle_images vi 
                 WHERE vi.vehicle_id = v.vehicle_id 
                 ORDER BY vi.id LIMIT 1),
                ''
            ) as image_url
        FROM raw.used_vehicles v
        WHERE v.vehicle_id IN :ids
    """)
    
    result = db.execute(query, {'ids': tuple(vehicle_ids)})
    
    vehicles = {}
    for row in result:
        vehicles[row[0]] = VehicleListItem(
            vehicle_id=row[0],
            title=row[1],
            brand=row[2],
            car_model=row[3],
            price=float(row[4]) if row[4] else None,
            mileage_str=row[5],
            fuel_type=row[6],
            transmission=row[7],
            exterior_color=row[8],
            car_rating=float(row[9]) if row[9] else None,
            vehicle_url=row[10],
            condition=row[11],
            image_url=row[12]
        )
    
    return vehicles


@router.get("/similar/{vehicle_id}", response_model=RecommendationResponse)
async def get_similar_vehicles(
    vehicle_id: str,
    limit: int = Query(10, ge=1, le=50, description="Number of similar vehicles to return"),
    db: Session = Depends(get_db)
):
    """
    Get similar vehicles based on Item-based Collaborative Filtering.
    
    This endpoint finds vehicles that users with similar tastes also viewed/clicked/saved.
    Falls back to content-based similarity for cold-start items.
    """
    # Verify vehicle exists
    check_query = text("SELECT vehicle_id FROM raw.used_vehicles WHERE vehicle_id = :id")
    exists = db.execute(check_query, {'id': vehicle_id}).fetchone()
    
    if not exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle {vehicle_id} not found"
        )
    
    # Get recommendation engine
    engine = get_recommendation_engine(db)
    
    # Get similar vehicles
    similar = engine.get_similar_vehicles(vehicle_id, top_k=limit)
    
    if not similar:
        # Fallback to content-based
        similar = engine._content_based_similar(vehicle_id, top_k=limit)
    
    # Fetch vehicle details
    vehicle_ids = [vid for vid, _ in similar]
    vehicle_details = _fetch_vehicle_details(db, vehicle_ids)
    
    # Build response
    recommendations = []
    for vid, score in similar:
        if vid in vehicle_details:
            recommendations.append(RecommendationItem(
                vehicle=vehicle_details[vid],
                score=score,
                reason="Users who viewed this also viewed"
            ))
    
    return RecommendationResponse(
        recommendations=recommendations,
        total=len(recommendations),
        algorithm="item-based-cf" if engine.is_fitted else "content-based"
    )


@router.get("/personalized", response_model=RecommendationResponse)
async def get_personalized_recommendations(
    limit: int = Query(20, ge=1, le=100),
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: Session = Depends(get_db)
):
    """
    Get personalized recommendations for the current user.
    
    Based on the user's interaction history (views, clicks, saves, contacts),
    this endpoint recommends vehicles that similar users also liked.
    """
    engine = get_recommendation_engine(db)
    
    if user_id:
        recommendations_raw = engine.get_personalized_recommendations(user_id, top_k=limit)
    else:
        recommendations_raw = engine._get_popular_vehicles(top_k=limit)
    
    # Fetch vehicle details
    vehicle_ids = [vid for vid, _, _ in recommendations_raw]
    vehicle_details = _fetch_vehicle_details(db, vehicle_ids)
    
    # Build response
    recommendations = []
    for vid, score, reason in recommendations_raw:
        if vid in vehicle_details:
            recommendations.append(RecommendationItem(
                vehicle=vehicle_details[vid],
                score=score,
                reason=reason
            ))
    
    algorithm = "item-based-cf" if user_id and engine.is_fitted else "popularity"
    
    return RecommendationResponse(
        recommendations=recommendations,
        total=len(recommendations),
        algorithm=algorithm
    )


@router.get("/candidate", response_model=RecommendationResponse)
async def get_candidates(
    limit: int = Query(100, ge=1, le=500),
    brand: Optional[str] = Query(None),
    price_min: Optional[float] = Query(None),
    price_max: Optional[float] = Query(None),
    fuel_type: Optional[str] = Query(None),
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: Session = Depends(get_db)
):
    """
    Get recommendation candidates for the two-stage recommendation pipeline.
    
    Stage 1 (this endpoint): Generate large candidate set
    Stage 2: Apply re-ranking, business rules, and filtering
    """
    engine = get_recommendation_engine(db)
    
    filters = {}
    if brand:
        filters['brand'] = brand
    if price_min:
        filters['price_min'] = price_min
    if price_max:
        filters['price_max'] = price_max
    if fuel_type:
        filters['fuel_type'] = fuel_type
    
    candidates = engine.get_candidate_recommendations(
        user_id=user_id,
        filters=filters if filters else None,
        top_k=limit
    )
    
    # Fetch vehicle details
    vehicle_ids = [vid for vid, _, _ in candidates]
    vehicle_details = _fetch_vehicle_details(db, vehicle_ids)
    
    # Build response
    recommendations = []
    for vid, score, reason in candidates:
        if vid in vehicle_details:
            recommendations.append(RecommendationItem(
                vehicle=vehicle_details[vid],
                score=score,
                reason=reason
            ))
    
    return RecommendationResponse(
        recommendations=recommendations,
        total=len(recommendations),
        algorithm="hybrid-candidate-generation"
    )


@router.get("/popular", response_model=RecommendationResponse)
async def get_popular_vehicles(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get popular vehicles based on interaction count and ratings.
    
    Used for:
    - Homepage featured vehicles
    - Cold-start users with no history
    - Fallback when personalization fails
    """
    query = text("""
        SELECT 
            v.vehicle_id,
            v.title,
            v.brand,
            v.car_model,
            v.price,
            v.mileage_str,
            v.fuel_type,
            v.transmission,
            v.exterior_color,
            v.car_rating,
            v.vehicle_url,
            v.condition,
            COALESCE(COUNT(ui.id), 0) as interaction_count,
            COALESCE(
                (SELECT image_url FROM raw.vehicle_images vi 
                 WHERE vi.vehicle_id = v.vehicle_id 
                 ORDER BY vi.id LIMIT 1),
                ''
            ) as image_url
        FROM raw.used_vehicles v
        LEFT JOIN gold.user_interactions ui ON v.vehicle_id = ui.vehicle_id
        WHERE v.title IS NOT NULL
        GROUP BY v.vehicle_id, v.title, v.brand, v.car_model, v.price, 
                 v.mileage_str, v.fuel_type, v.transmission, v.exterior_color,
                 v.car_rating, v.vehicle_url, v.condition
        ORDER BY interaction_count DESC, v.car_rating DESC NULLS LAST
        LIMIT :limit
    """)
    
    result = db.execute(query, {'limit': limit})
    
    recommendations = []
    for row in result:
        vehicle = VehicleListItem(
            vehicle_id=row[0],
            title=row[1],
            brand=row[2],
            car_model=row[3],
            price=float(row[4]) if row[4] else None,
            mileage_str=row[5],
            fuel_type=row[6],
            transmission=row[7],
            exterior_color=row[8],
            car_rating=float(row[9]) if row[9] else None,
            vehicle_url=row[10],
            condition=row[11],
            image_url=row[13]
        )
        
        recommendations.append(RecommendationItem(
            vehicle=vehicle,
            score=float(row[12]) + (float(row[9]) if row[9] else 0),
            reason="Popular choice"
        ))
    
    return RecommendationResponse(
        recommendations=recommendations,
        total=len(recommendations),
        algorithm="popularity"
    )


@router.get("/hybrid", response_model=RecommendationResponse)
async def get_hybrid_recommendations(
    limit: int = Query(20, ge=1, le=100),
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: Session = Depends(get_db)
):
    """
    Get hybrid recommendations combining collaborative filtering and popularity.
    
    Algorithm:
    - 70% from personalized recommendations (if user logged in)
    - 30% from popular vehicles (for diversity)
    """
    engine = get_recommendation_engine(db)
    
    personalized_limit = int(limit * 0.7) if user_id else 0
    popular_limit = limit - personalized_limit
    
    recommendations = []
    seen_ids = set()
    
    # Get personalized recommendations
    if user_id and personalized_limit > 0:
        personal_recs = engine.get_personalized_recommendations(user_id, top_k=personalized_limit)
        vehicle_ids = [vid for vid, _, _ in personal_recs]
        vehicle_details = _fetch_vehicle_details(db, vehicle_ids)
        
        for vid, score, reason in personal_recs:
            if vid in vehicle_details and vid not in seen_ids:
                recommendations.append(RecommendationItem(
                    vehicle=vehicle_details[vid],
                    score=score,
                    reason=reason
                ))
                seen_ids.add(vid)
    
    # Fill remaining with popular
    popular_recs = engine._get_popular_vehicles(top_k=popular_limit + 10)
    vehicle_ids = [vid for vid, _, _ in popular_recs if vid not in seen_ids]
    vehicle_details = _fetch_vehicle_details(db, vehicle_ids)
    
    for vid, score, reason in popular_recs:
        if len(recommendations) >= limit:
            break
        if vid in vehicle_details and vid not in seen_ids:
            recommendations.append(RecommendationItem(
                vehicle=vehicle_details[vid],
                score=score,
                reason="Trending now"
            ))
            seen_ids.add(vid)
    
    return RecommendationResponse(
        recommendations=recommendations[:limit],
        total=len(recommendations[:limit]),
        algorithm="hybrid"
    )


@router.post("/refresh")
async def refresh_recommendation_model(db: Session = Depends(get_db)):
    """
    Refresh the recommendation model with latest interaction data.
    Should be called periodically (e.g., hourly) or after significant new data.
    """
    global _recommendation_engine
    
    try:
        _recommendation_engine = RecommendationEngine(db)
        _recommendation_engine.fit(days_lookback=90)
        
        return {
            "status": "success",
            "message": "Recommendation model refreshed",
            "is_fitted": _recommendation_engine.is_fitted,
            "num_items": len(_recommendation_engine.vehicle_id_to_idx),
            "num_users": len(_recommendation_engine.user_id_to_idx)
        }
    except Exception as e:
        logger.error(f"Failed to refresh recommendation model: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to refresh model: {str(e)}"
        )

