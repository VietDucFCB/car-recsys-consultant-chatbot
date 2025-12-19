"""
Vehicle schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class VehicleResponse(BaseModel):
    id: str  # vehicle_id is TEXT (VIN)
    title: str
    price: Optional[str] = None  # NUMERIC converted to text
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[str] = None  # Not in DB, using empty string
    mileage: Optional[str] = None  # BIGINT converted to text
    fuel_type: Optional[str] = None
    transmission: Optional[str] = None
    body_type: Optional[str] = None
    color: Optional[str] = None
    seats: Optional[str] = None  # Not in DB, using empty string
    origin: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    seller_name: Optional[str] = None
    seller_phone: Optional[str] = None
    posted_date: Optional[str] = None  # created_at converted to text
    url: Optional[str] = None

    class Config:
        from_attributes = True


class VehicleSearchRequest(BaseModel):
    query: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    year_min: Optional[int] = None
    year_max: Optional[int] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    mileage_max: Optional[float] = None
    fuel_type: Optional[str] = None
    transmission: Optional[str] = None
    body_type: Optional[str] = None
    location: Optional[str] = None
    sort_by: Optional[str] = "posted_date"  # price, year, mileage, posted_date
    sort_order: Optional[str] = "desc"  # asc, desc
    page: int = 1
    page_size: int = 20


class VehicleSearchResponse(BaseModel):
    results: List[VehicleResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
