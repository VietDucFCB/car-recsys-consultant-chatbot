"""
Ingest vehicle data into Qdrant vector database for chatbot
"""
import os
import sys
import logging
from typing import List, Dict, Any
import json

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from langchain_openai import OpenAIEmbeddings
from qdrant_client import QdrantClient
from qdrant_client.http import models
from sqlalchemy import create_engine, text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://admin:admin123@localhost:5432/car_recsys")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "car_chatbot_vectors")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIM = 3072
BATCH_SIZE = 50


def get_engine():
    """Get SQLAlchemy engine"""
    return create_engine(DATABASE_URL)


def fetch_vehicles(engine, limit: int = None) -> List[Dict[str, Any]]:
    """Fetch vehicle data from database"""
    query = """
        SELECT 
            v.id,
            v.vin,
            v.year,
            v.make,
            v.model,
            v.trim,
            v.body_type,
            v.engine,
            v.transmission,
            v.drivetrain,
            v.fuel_type,
            v.exterior_color,
            v.interior_color,
            v.mileage,
            v.price,
            v.condition,
            v.description,
            v.city,
            v.state,
            v.zip_code,
            COALESCE(
                (SELECT string_agg(DISTINCT vf.feature_name, ', ')
                 FROM raw.vehicle_features vf 
                 WHERE vf.vehicle_id = v.id), ''
            ) as features,
            (SELECT vi.image_url 
             FROM raw.vehicle_images vi 
             WHERE vi.vehicle_id = v.id 
             LIMIT 1) as image_url
        FROM raw.used_vehicles v
        WHERE v.price > 0
    """
    
    if limit:
        query += f" LIMIT {limit}"
    
    with engine.connect() as conn:
        result = conn.execute(text(query))
        vehicles = []
        for row in result:
            vehicles.append({
                "id": str(row[0]),
                "vin": row[1],
                "year": row[2],
                "make": row[3],
                "model": row[4],
                "trim": row[5],
                "body_type": row[6],
                "engine": row[7],
                "transmission": row[8],
                "drivetrain": row[9],
                "fuel_type": row[10],
                "exterior_color": row[11],
                "interior_color": row[12],
                "mileage": row[13],
                "price": float(row[14]) if row[14] else None,
                "condition": row[15],
                "description": row[16],
                "city": row[17],
                "state": row[18],
                "zip_code": row[19],
                "features": row[20],
                "image_url": row[21]
            })
    
    return vehicles


def create_vehicle_text(vehicle: Dict[str, Any]) -> str:
    """Create searchable text representation of vehicle"""
    parts = []
    
    # Basic info
    year = vehicle.get("year", "")
    make = vehicle.get("make", "")
    model = vehicle.get("model", "")
    trim = vehicle.get("trim", "")
    
    if year and make and model:
        title = f"{year} {make} {model}"
        if trim:
            title += f" {trim}"
        parts.append(title)
    
    # Body type
    if vehicle.get("body_type"):
        parts.append(f"Body Type: {vehicle['body_type']}")
    
    # Engine
    if vehicle.get("engine"):
        parts.append(f"Engine: {vehicle['engine']}")
    
    # Transmission
    if vehicle.get("transmission"):
        parts.append(f"Transmission: {vehicle['transmission']}")
    
    # Drivetrain
    if vehicle.get("drivetrain"):
        parts.append(f"Drivetrain: {vehicle['drivetrain']}")
    
    # Fuel type
    if vehicle.get("fuel_type"):
        parts.append(f"Fuel Type: {vehicle['fuel_type']}")
    
    # Colors
    if vehicle.get("exterior_color"):
        parts.append(f"Exterior Color: {vehicle['exterior_color']}")
    if vehicle.get("interior_color"):
        parts.append(f"Interior Color: {vehicle['interior_color']}")
    
    # Price
    if vehicle.get("price"):
        parts.append(f"Price: ${vehicle['price']:,.0f}")
    
    # Mileage
    if vehicle.get("mileage"):
        parts.append(f"Mileage: {vehicle['mileage']:,} miles")
    
    # Condition
    if vehicle.get("condition"):
        parts.append(f"Condition: {vehicle['condition']}")
    
    # Location
    city = vehicle.get("city", "")
    state = vehicle.get("state", "")
    if city and state:
        parts.append(f"Location: {city}, {state}")
    
    # Features
    if vehicle.get("features"):
        parts.append(f"Features: {vehicle['features']}")
    
    # Description
    if vehicle.get("description"):
        desc = vehicle["description"][:500]  # Limit description length
        parts.append(f"Description: {desc}")
    
    return "\n".join(parts)


def init_qdrant_collection(client: QdrantClient):
    """Initialize Qdrant collection"""
    try:
        # Check if collection exists
        collections = client.get_collections().collections
        exists = any(c.name == COLLECTION_NAME for c in collections)
        
        if exists:
            logger.info(f"Collection {COLLECTION_NAME} already exists, recreating...")
            client.delete_collection(COLLECTION_NAME)
        
        # Create collection
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(
                size=EMBEDDING_DIM,
                distance=models.Distance.COSINE
            )
        )
        logger.info(f"Created collection {COLLECTION_NAME}")
        
    except Exception as e:
        logger.error(f"Error initializing collection: {e}")
        raise


def ingest_vehicles(limit: int = None):
    """Main ingestion function"""
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY environment variable is required")
    
    logger.info("Starting vehicle data ingestion to Qdrant...")
    
    # Initialize clients
    engine = get_engine()
    qdrant = QdrantClient(url=QDRANT_URL)
    embeddings = OpenAIEmbeddings(
        model=EMBEDDING_MODEL,
        openai_api_key=OPENAI_API_KEY
    )
    
    # Initialize collection
    init_qdrant_collection(qdrant)
    
    # Fetch vehicles
    logger.info("Fetching vehicles from database...")
    vehicles = fetch_vehicles(engine, limit)
    logger.info(f"Found {len(vehicles)} vehicles")
    
    if not vehicles:
        logger.warning("No vehicles found!")
        return
    
    # Process in batches
    total_ingested = 0
    
    for i in range(0, len(vehicles), BATCH_SIZE):
        batch = vehicles[i:i + BATCH_SIZE]
        
        # Create text representations
        texts = [create_vehicle_text(v) for v in batch]
        
        # Generate embeddings
        logger.info(f"Generating embeddings for batch {i // BATCH_SIZE + 1}...")
        try:
            vectors = embeddings.embed_documents(texts)
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            continue
        
        # Prepare points for Qdrant
        points = []
        for j, (vehicle, vector) in enumerate(zip(batch, vectors)):
            point = models.PointStruct(
                id=i + j,  # Use sequential ID
                vector=vector,
                payload={
                    "vehicle_id": vehicle["id"],
                    "year": vehicle.get("year"),
                    "make": vehicle.get("make"),
                    "model": vehicle.get("model"),
                    "trim": vehicle.get("trim"),
                    "body_type": vehicle.get("body_type"),
                    "price": vehicle.get("price"),
                    "mileage": vehicle.get("mileage"),
                    "transmission": vehicle.get("transmission"),
                    "fuel_type": vehicle.get("fuel_type"),
                    "exterior_color": vehicle.get("exterior_color"),
                    "city": vehicle.get("city"),
                    "state": vehicle.get("state"),
                    "features": vehicle.get("features"),
                    "image_url": vehicle.get("image_url"),
                    "text": texts[j][:1000]  # Store truncated text for reference
                }
            )
            points.append(point)
        
        # Upsert to Qdrant
        try:
            qdrant.upsert(
                collection_name=COLLECTION_NAME,
                points=points
            )
            total_ingested += len(points)
            logger.info(f"Ingested {total_ingested}/{len(vehicles)} vehicles")
        except Exception as e:
            logger.error(f"Error upserting to Qdrant: {e}")
    
    logger.info(f"Ingestion complete! Total vehicles: {total_ingested}")
    
    # Verify
    collection_info = qdrant.get_collection(COLLECTION_NAME)
    logger.info(f"Collection info: {collection_info.points_count} points")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Ingest vehicle data to Qdrant")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of vehicles")
    args = parser.parse_args()
    
    ingest_vehicles(args.limit)
