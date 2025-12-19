"""
Search endpoints
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
import math

from app.core.database import get_db
from app.schemas.vehicle import VehicleResponse, VehicleSearchResponse

router = APIRouter()


@router.get("/search", response_model=VehicleSearchResponse)
async def search_vehicles(
    query: Optional[str] = Query(None, description="Search query for title, brand, model"),
    condition: Optional[str] = Query(None, description="Vehicle condition: used or new"),
    brand: Optional[str] = Query(None),
    model: Optional[str] = Query(None),
    year_min: Optional[int] = Query(None),
    year_max: Optional[int] = Query(None),
    price_min: Optional[float] = Query(None),
    price_max: Optional[float] = Query(None),
    mileage_max: Optional[float] = Query(None),
    fuel_type: Optional[str] = Query(None),
    transmission: Optional[str] = Query(None),
    body_type: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    sort_by: str = Query("id", description="Sort field: price, year, mileage, id"),
    sort_order: str = Query("desc", description="Sort order: asc, desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Search vehicles with filters using raw SQL for reliability
    """
    # Determine which table to query based on condition
    table_name = "raw.new_vehicles" if condition and condition.lower() == "new" else "raw.used_vehicles"
    
    # Build WHERE conditions
    conditions = []
    params = {}
    
    if query:
        conditions.append("(title ILIKE :query OR brand ILIKE :query OR model ILIKE :query)")
        params['query'] = f"%{query}%"
    
    if brand:
        conditions.append("brand ILIKE :brand")
        params['brand'] = f"%{brand}%"
    
    if model:
        conditions.append("model ILIKE :model")
        params['model'] = f"%{model}%"
    
    if year_min:
        conditions.append("year >= :year_min")
        params['year_min'] = year_min
    
    if year_max:
        conditions.append("year <= :year_max")
        params['year_max'] = year_max
    
    if price_min:
        conditions.append("price >= :price_min")
        params['price_min'] = price_min
    
    if price_max:
        conditions.append("price <= :price_max")
        params['price_max'] = price_max
    
    if mileage_max:
        conditions.append("mileage <= :mileage_max")
        params['mileage_max'] = mileage_max
    
    if fuel_type:
        conditions.append("fuel_type ILIKE :fuel_type")
        params['fuel_type'] = f"%{fuel_type}%"
    
    if transmission:
        conditions.append("transmission ILIKE :transmission")
        params['transmission'] = f"%{transmission}%"
    
    if body_type:
        conditions.append("body_type ILIKE :body_type")
        params['body_type'] = f"%{body_type}%"
    
    if location:
        conditions.append("location ILIKE :location")
        params['location'] = f"%{location}%"
    
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    # Get total count
    count_sql = f"SELECT COUNT(*) FROM {table_name} WHERE {where_clause}"
    total = db.execute(text(count_sql), params).scalar()
    
    # Build ORDER BY
    # Map id to vehicle_id since that's the actual column name
    sort_column_map = {
        'id': 'vehicle_id',
        'price': 'price',
        'mileage': 'mileage'
    }
    sort_column = sort_column_map.get(sort_by, 'vehicle_id')
    order = 'ASC' if sort_order.lower() == 'asc' else 'DESC'
    
    # Get paginated results
    offset = (page - 1) * page_size
    params['limit'] = page_size
    params['offset'] = offset
    
    query_sql = f"""
        SELECT 
            vehicle_id, 
            vehicle_url, 
            title, 
            price::text, 
            brand, 
            car_model, 
            '' as year, 
            mileage::text, 
            fuel_type, 
            transmission, 
            '' as body_type, 
            exterior_color, 
            '' as seats, 
            '' as origin, 
            '' as location, 
            '' as description, 
            '' as image_url, 
            '' as seller_name, 
            '' as seller_phone, 
            created_at::text as posted_date
        FROM {table_name} 
        WHERE {where_clause}
        ORDER BY {sort_column} {order} NULLS LAST
        LIMIT :limit OFFSET :offset
    """
    
    result = db.execute(text(query_sql), params)
    vehicles = []
    
    for row in result:
        vehicles.append(VehicleResponse(
            id=row[0],
            url=row[1],
            title=row[2],
            price=row[3],
            brand=row[4],
            model=row[5],
            year=row[6],
            mileage=row[7],
            fuel_type=row[8],
            transmission=row[9],
            body_type=row[10],
            color=row[11],
            seats=row[12],
            origin=row[13],
            location=row[14],
            description=row[15],
            image_url=row[16],
            seller_name=row[17],
            seller_phone=row[18],
            posted_date=row[19]
        ))
    
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    
    return VehicleSearchResponse(
        results=vehicles,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )
