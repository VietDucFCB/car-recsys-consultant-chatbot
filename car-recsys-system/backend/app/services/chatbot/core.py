"""
Chatbot Core - Main logic for the car shopping assistant
Uses Qdrant for vector similarity search instead of Chroma
"""
import os
import logging
from typing import List, Dict, Any, Tuple, Optional
from collections import defaultdict
from datetime import datetime

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_core.output_parsers import StrOutputParser

from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance

from app.core.config import settings

logger = logging.getLogger(__name__)

# Collection name in Qdrant
QDRANT_COLLECTION = "car_chatbot_vectors"
EMBEDDING_DIM = 3072  # text-embedding-3-large dimension


class ChatbotCore:
    """Core chatbot functionality with Qdrant vector search"""
    
    def __init__(
        self,
        llm: ChatOpenAI,
        embeddings: OpenAIEmbeddings,
        qdrant_client: QdrantClient,
        db_engine,
    ):
        self.llm = llm
        self.embeddings = embeddings
        self.qdrant = qdrant_client
        self.db_engine = db_engine
        
    def get_image_urls(self, vehicle_id: str, max_images: int = 3) -> List[str]:
        """Get vehicle images from database"""
        try:
            with self.db_engine.connect() as con:
                query = text("""
                    SELECT image_url
                    FROM raw.vehicle_images
                    WHERE vehicle_id = :vehicle_id
                    ORDER BY id
                    LIMIT :max_images
                """)
                result = con.execute(query, {"vehicle_id": vehicle_id, "max_images": max_images})
                return [row[0] for row in result]
        except Exception as e:
            logger.error(f"Error getting images: {e}")
            return []
    
    def get_vehicle_features(self, vehicle_id: str) -> Dict[str, List[str]]:
        """Get vehicle features grouped by category"""
        try:
            features = defaultdict(list)
            with self.db_engine.connect() as con:
                query = text("""
                    SELECT feature_category, feature_name
                    FROM raw.vehicle_features
                    WHERE vehicle_id = :vehicle_id
                """)
                result = con.execute(query, {"vehicle_id": vehicle_id})
                for category, name in result:
                    if name and name not in features[category]:
                        features[category].append(name)
            return dict(features)
        except Exception as e:
            logger.error(f"Error getting features: {e}")
            return {}
    
    def search_vehicles(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for vehicles using vector similarity"""
        try:
            # Check if collection exists
            try:
                collection_info = self.qdrant.get_collection(QDRANT_COLLECTION)
                if collection_info.points_count == 0:
                    logger.warning(f"Qdrant collection {QDRANT_COLLECTION} is empty. Please run data ingestion first.")
                    return []
            except Exception:
                logger.warning(f"Qdrant collection {QDRANT_COLLECTION} does not exist. Please run data ingestion first.")
                return []
            
            # Get embedding for query
            query_embedding = self.embeddings.embed_query(query)
            
            # Search in Qdrant
            results = self.qdrant.search(
                collection_name=QDRANT_COLLECTION,
                query_vector=query_embedding,
                limit=limit,
                score_threshold=0.3,
            )
            
            # Format results
            vehicles = []
            for hit in results:
                payload = hit.payload
                vehicle_id = payload.get("vehicle_id", "")
                
                # Get additional data
                images = self.get_image_urls(vehicle_id, 3)
                features = self.get_vehicle_features(vehicle_id)
                
                vehicles.append({
                    "vehicle_id": vehicle_id,
                    "score": hit.score,
                    "metadata": payload,
                    "images": images,
                    "features": features,
                })
            
            return vehicles
        except Exception as e:
            logger.error(f"Error searching vehicles: {e}")
            return []
    
    def format_context(self, vehicles: List[Dict[str, Any]]) -> str:
        """Format vehicle results for LLM context"""
        if not vehicles:
            return "No relevant car listings found."
        
        formatted = ""
        for i, vehicle in enumerate(vehicles, 1):
            meta = vehicle["metadata"]
            images = vehicle.get("images", [])
            features = vehicle.get("features", {})
            score = vehicle.get("score", 0)
            
            # Format images
            img_str = "\n".join([f"- {url}" for url in images]) if images else "- No images available"
            
            # Format features
            if features:
                feature_str = "\n".join(
                    f"- {ftype}: {', '.join(fnames)}"
                    for ftype, fnames in features.items()
                )
            else:
                feature_str = "- No feature data"
            
            # Format price
            price = meta.get('price')
            if isinstance(price, (int, float)):
                price_str = f"${price:,.0f}"
            else:
                price_str = str(price) if price else "N/A"
            
            # Format mileage
            mileage = meta.get('mileage')
            if isinstance(mileage, (int, float)):
                mileage_str = f"{mileage:,.0f} miles"
            else:
                mileage_str = str(mileage) if mileage else "N/A"
            
            formatted += f"""
--- Car Option {i} (Relevance: {score:.2f}) ---
ID: {meta.get('vehicle_id', 'N/A')}
Year: {meta.get('year', 'N/A')}
Make: {meta.get('make', 'N/A')}
Model: {meta.get('model', 'N/A')}
Trim: {meta.get('trim', 'N/A')}
Body Type: {meta.get('body_type', 'N/A')}
Price: {price_str}
Mileage: {mileage_str}
Exterior Color: {meta.get('exterior_color', 'N/A')}
Fuel Type: {meta.get('fuel_type', 'N/A')}
Transmission: {meta.get('transmission', 'N/A')}
Location: {meta.get('city', 'N/A')}, {meta.get('state', 'N/A')}

Features:
{feature_str}

Images:
{img_str}
"""
        return formatted
    
    def get_standalone_question(self, history: List[BaseMessage], user_input: str) -> str:
        """Convert follow-up question to standalone question"""
        if not history:
            return user_input
        
        condense_prompt = """Given a chat history and the latest user question which might reference context in the chat history,
formulate a standalone question that can be understood without the chat history.
Do NOT answer the question, just reformulate it if needed."""

        prompt = ChatPromptTemplate.from_messages([
            ("system", condense_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{question}")
        ])
        
        chain = prompt | self.llm | StrOutputParser()
        
        return chain.invoke({
            "chat_history": history,
            "question": user_input
        })
    
    def generate_response(
        self,
        chat_history: List[BaseMessage],
        user_input: str,
    ) -> Tuple[str, List[BaseMessage], List[Dict[str, Any]]]:
        """
        Generate chatbot response
        
        Returns:
            response_text: The AI response
            updated_history: Updated chat history
            vehicles: List of relevant vehicles found
        """
        # 1. Normalize query for search
        search_query = self.get_standalone_question(chat_history, user_input)
        
        # 2. Vector search
        vehicles = self.search_vehicles(search_query, limit=10)
        knowledge_context = self.format_context(vehicles)
        
        # 3. Build prompt
        system_prompt = """You are a helpful and friendly Car Shopping Assistant for CarMarket.

Instructions:
1. Answer the user's question based strictly on the provided 'Knowledge Context'.
2. When recommending cars:
   - Briefly describe each car using: title, brand, condition (new/used), mileage, price, exterior color
   - Always format price with comma separators (e.g., $21,950)
   - Keep responses short, natural, and helpful — like a professional car salesperson
   - Include relevant features when available
3. If the user wants more details or images, provide them when explicitly requested.
4. If the answer is not in the context, politely say you don't have that info but offer general advice.
5. Include [View Details](link) if a post_link/vehicle_url is available in the metadata.
6. When comparing cars, use bullet points for clarity.
7. Be conversational and helpful, asking follow-up questions when appropriate."""

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("system", "Knowledge Context:\n{context}"),
            MessagesPlaceholder("chat_history"),
            ("human", "{question}")
        ])
        
        chain = prompt | self.llm | StrOutputParser()
        
        response = chain.invoke({
            "context": knowledge_context,
            "chat_history": chat_history,
            "question": user_input
        })
        
        # 4. Update history
        updated_history = chat_history.copy()
        updated_history.append(HumanMessage(content=user_input))
        updated_history.append(AIMessage(content=response))
        
        # Keep only last 10 messages
        if len(updated_history) > 10:
            updated_history = updated_history[-10:]
        
        return response, updated_history, vehicles


# Global instance
_chatbot_instance: Optional[ChatbotCore] = None


def initialize_chatbot() -> ChatbotCore:
    """Initialize and return chatbot instance"""
    global _chatbot_instance
    
    if _chatbot_instance is not None:
        return _chatbot_instance
    
    # Initialize OpenAI
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY environment variable is required")
    
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-large",
        openai_api_key=openai_api_key,
    )
    
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.5,
        openai_api_key=openai_api_key,
    )
    
    # Initialize Qdrant
    qdrant_client = QdrantClient(url=settings.QDRANT_URL)
    
    # Initialize database
    db_engine = create_engine(
        settings.DATABASE_URL,
        pool_size=5,
        max_overflow=10,
    )
    
    _chatbot_instance = ChatbotCore(
        llm=llm,
        embeddings=embeddings,
        qdrant_client=qdrant_client,
        db_engine=db_engine,
    )
    
    logger.info("Chatbot initialized successfully")
    return _chatbot_instance
