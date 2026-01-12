"""
Reviews and Ratings API endpoints
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db

router = APIRouter()


class ReviewResponse(BaseModel):
    """Review response schema"""
    vehicle_id: str
    title: Optional[str] = None
    overall_rating: Optional[float] = None
    review_time: Optional[str] = None
    user_name: Optional[str] = None
    user_location: Optional[str] = None
    review_text: Optional[str] = None
    comfort_rating: Optional[float] = None
    interior_rating: Optional[float] = None
    performance_rating: Optional[float] = None
    value_rating: Optional[float] = None
    exterior_rating: Optional[float] = None
    reliability_rating: Optional[float] = None
    
    class Config:
        from_attributes = True


class SellerResponse(BaseModel):
    """Seller response schema"""
    seller_key: str
    seller_name: Optional[str] = None
    seller_address: Optional[str] = None
    seller_city: Optional[str] = None
    seller_state: Optional[str] = None
    seller_zip: Optional[str] = None
    seller_phone: Optional[str] = None
    seller_website: Optional[str] = None
    seller_rating: Optional[float] = None
    seller_rating_count: Optional[int] = None
    description: Optional[str] = None
    hours_monday: Optional[str] = None
    hours_tuesday: Optional[str] = None
    hours_wednesday: Optional[str] = None
    hours_thursday: Optional[str] = None
    hours_friday: Optional[str] = None
    hours_saturday: Optional[str] = None
    hours_sunday: Optional[str] = None
    
    class Config:
        from_attributes = True


@router.get("/reviews/{vehicle_id}", response_model=List[ReviewResponse])
async def get_vehicle_reviews(
    vehicle_id: str,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Get reviews for a specific vehicle
    """
    query = text("""
        SELECT 
            vehicle_id,
            title,
            overall_rating,
            review_time,
            user_name,
            user_location,
            review_text,
            comfort_rating,
            interior_rating,
            performance_rating,
            value_rating,
            exterior_rating,
            reliability_rating
        FROM raw.reviews_ratings
        WHERE vehicle_id = :vehicle_id
        ORDER BY created_at DESC
        LIMIT :limit
    """)
    
    result = db.execute(query, {"vehicle_id": vehicle_id, "limit": limit})
    reviews = result.fetchall()
    
    return [
        ReviewResponse(
            vehicle_id=row.vehicle_id,
            title=row.title,
            overall_rating=float(row.overall_rating) if row.overall_rating else None,
            review_time=row.review_time,
            user_name=row.user_name,
            user_location=row.user_location,
            review_text=row.review_text,
            comfort_rating=float(row.comfort_rating) if row.comfort_rating else None,
            interior_rating=float(row.interior_rating) if row.interior_rating else None,
            performance_rating=float(row.performance_rating) if row.performance_rating else None,
            value_rating=float(row.value_rating) if row.value_rating else None,
            exterior_rating=float(row.exterior_rating) if row.exterior_rating else None,
            reliability_rating=float(row.reliability_rating) if row.reliability_rating else None,
        )
        for row in reviews
    ]


@router.get("/seller/{vehicle_id}", response_model=Optional[SellerResponse])
async def get_vehicle_seller(
    vehicle_id: str,
    db: Session = Depends(get_db)
):
    """
    Get seller info for a specific vehicle
    """
    query = text("""
        SELECT 
            s.seller_key,
            s.seller_name,
            s.seller_address,
            s.seller_city,
            s.seller_state,
            s.seller_zip,
            s.seller_phone,
            s.seller_website,
            s.seller_rating,
            s.seller_rating_count,
            s.description,
            s.hours_monday,
            s.hours_tuesday,
            s.hours_wednesday,
            s.hours_thursday,
            s.hours_friday,
            s.hours_saturday,
            s.hours_sunday
        FROM raw.sellers s
        INNER JOIN raw.seller_vehicle_relationships svr ON s.seller_key = svr.seller_key
        WHERE svr.vehicle_id = :vehicle_id
        LIMIT 1
    """)
    
    result = db.execute(query, {"vehicle_id": vehicle_id})
    row = result.fetchone()
    
    if not row:
        return None
    
    return SellerResponse(
        seller_key=row.seller_key,
        seller_name=row.seller_name,
        seller_address=row.seller_address,
        seller_city=row.seller_city,
        seller_state=row.seller_state,
        seller_zip=row.seller_zip,
        seller_phone=row.seller_phone,
        seller_website=row.seller_website,
        seller_rating=float(row.seller_rating) if row.seller_rating else None,
        seller_rating_count=int(row.seller_rating_count) if row.seller_rating_count else None,
        description=row.description,
        hours_monday=row.hours_monday,
        hours_tuesday=row.hours_tuesday,
        hours_wednesday=row.hours_wednesday,
        hours_thursday=row.hours_thursday,
        hours_friday=row.hours_friday,
        hours_saturday=row.hours_saturday,
        hours_sunday=row.hours_sunday,
    )
