"""
Chat API endpoints
"""
import uuid
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import get_current_user_id_optional

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class ChatMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    conversation_id: Optional[str] = None


class ChatMessageResponse(BaseModel):
    conversation_id: str
    message_id: str
    response: str
    vehicles: List[Dict[str, Any]] = []
    timestamp: str


class ConversationResponse(BaseModel):
    conversation_id: str
    user_id: Optional[str]
    created_at: str
    updated_at: str
    message_count: int
    preview: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str  # "user" or "assistant"
    content: str
    created_at: str
    vehicles: List[Dict[str, Any]] = []


# =============================================================================
# DATABASE HELPER FUNCTIONS
# =============================================================================

def ensure_chat_tables(db: Session):
    """Ensure chat tables exist"""
    try:
        # Check if tables exist, create if not
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS gold.chat_conversations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES gold.users(id) ON DELETE SET NULL,
                session_id TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE TABLE IF NOT EXISTS gold.chat_messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                conversation_id UUID REFERENCES gold.chat_conversations(id) ON DELETE CASCADE,
                user_id UUID REFERENCES gold.users(id) ON DELETE SET NULL,
                role TEXT NOT NULL,  -- 'user' or 'assistant'
                content TEXT NOT NULL,
                vehicles JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation 
                ON gold.chat_messages(conversation_id);
            CREATE INDEX IF NOT EXISTS idx_chat_conversations_user 
                ON gold.chat_conversations(user_id);
        """))
        db.commit()
    except Exception as e:
        logger.warning(f"Chat tables might already exist: {e}")
        db.rollback()


def get_or_create_conversation(
    db: Session, 
    conversation_id: Optional[str], 
    user_id: Optional[str],
    session_id: str
) -> str:
    """Get existing conversation or create new one"""
    
    if conversation_id:
        # Verify conversation exists
        result = db.execute(
            text("SELECT id FROM gold.chat_conversations WHERE id = :id"),
            {"id": conversation_id}
        ).fetchone()
        
        if result:
            return conversation_id
    
    # Create new conversation
    new_id = str(uuid.uuid4())
    db.execute(
        text("""
            INSERT INTO gold.chat_conversations (id, user_id, session_id, created_at, updated_at)
            VALUES (:id, :user_id, :session_id, NOW(), NOW())
        """),
        {"id": new_id, "user_id": user_id, "session_id": session_id}
    )
    db.commit()
    
    return new_id


def save_message(
    db: Session,
    conversation_id: str,
    role: str,
    content: str,
    user_id: Optional[str] = None,
    vehicles: List[Dict[str, Any]] = None
) -> str:
    """Save a message to the database"""
    import json
    
    message_id = str(uuid.uuid4())
    vehicles_json = json.dumps(vehicles or [])
    
    db.execute(
        text("""
            INSERT INTO gold.chat_messages (id, conversation_id, user_id, role, content, vehicles, created_at)
            VALUES (:id, :conv_id, :user_id, :role, :content, CAST(:vehicles AS jsonb), NOW())
        """),
        {
            "id": message_id,
            "conv_id": conversation_id,
            "user_id": user_id,
            "role": role,
            "content": content,
            "vehicles": vehicles_json
        }
    )
    
    # Update conversation timestamp
    db.execute(
        text("UPDATE gold.chat_conversations SET updated_at = NOW() WHERE id = :id"),
        {"id": conversation_id}
    )
    
    db.commit()
    return message_id


def get_conversation_history(db: Session, conversation_id: str, limit: int = 50) -> List[Dict]:
    """Get conversation history"""
    result = db.execute(
        text("""
            SELECT id, role, content, vehicles, created_at
            FROM gold.chat_messages
            WHERE conversation_id = :conv_id
            ORDER BY created_at ASC
            LIMIT :limit
        """),
        {"conv_id": conversation_id, "limit": limit}
    )
    
    messages = []
    for row in result:
        messages.append({
            "id": str(row[0]),
            "role": row[1],
            "content": row[2],
            "vehicles": row[3] or [],
            "created_at": row[4].isoformat() if row[4] else None
        })
    
    return messages


# =============================================================================
# API ENDPOINTS
# =============================================================================

@router.post("/message", response_model=ChatMessageResponse)
async def send_message(
    request: ChatMessageRequest,
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    db: Session = Depends(get_db)
):
    """
    Send a message to the chatbot and get a response
    """
    try:
        # Ensure tables exist
        ensure_chat_tables(db)
        
        # Generate session ID for anonymous users
        session_id = str(uuid.uuid4())
        
        # Get or create conversation
        conversation_id = get_or_create_conversation(
            db, 
            request.conversation_id, 
            user_id,
            session_id
        )
        
        # Save user message
        save_message(db, conversation_id, "user", request.message, user_id)
        
        # Get conversation history for context
        history = get_conversation_history(db, conversation_id, limit=10)
        
        # Generate response using chatbot
        try:
            from app.services.chatbot.core import initialize_chatbot
            from langchain_core.messages import HumanMessage, AIMessage
            
            chatbot = initialize_chatbot()
            
            # Convert history to LangChain format
            chat_history = []
            for msg in history[:-1]:  # Exclude the message we just added
                if msg["role"] == "user":
                    chat_history.append(HumanMessage(content=msg["content"]))
                else:
                    chat_history.append(AIMessage(content=msg["content"]))
            
            # Generate response
            response, _, raw_vehicles = chatbot.generate_response(chat_history, request.message)
            
            # Format vehicles for frontend
            vehicles = []
            for v in raw_vehicles[:5]:
                meta = v.get("metadata", {})
                images = v.get("images", [])
                vehicles.append({
                    "id": meta.get("vehicle_id", ""),
                    "year": meta.get("year"),
                    "make": meta.get("make"),
                    "model": meta.get("model"),
                    "trim": meta.get("trim"),
                    "price": meta.get("price"),
                    "mileage": meta.get("mileage"),
                    "body_type": meta.get("body_type"),
                    "transmission": meta.get("transmission"),
                    "fuel_type": meta.get("fuel_type"),
                    "exterior_color": meta.get("exterior_color"),
                    "city": meta.get("city"),
                    "state": meta.get("state"),
                    "image_url": images[0] if images else meta.get("image_url"),
                })
            
        except Exception as e:
            logger.error(f"Chatbot error: {e}")
            response = "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment."
            vehicles = []
        
        # Save assistant response
        message_id = save_message(
            db, 
            conversation_id, 
            "assistant", 
            response, 
            vehicles=vehicles[:5] if vehicles else []
        )
        
        return ChatMessageResponse(
            conversation_id=conversation_id,
            message_id=message_id,
            response=response,
            vehicles=vehicles[:5] if vehicles else [],
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process message: {str(e)}"
        )


@router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(
    user_id: str = Depends(get_current_user_id_optional),
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get user's conversation history
    """
    if not user_id:
        return []
    
    try:
        ensure_chat_tables(db)
        
        result = db.execute(
            text("""
                SELECT 
                    c.id,
                    c.user_id,
                    c.created_at,
                    c.updated_at,
                    COUNT(m.id) as message_count,
                    (SELECT content FROM gold.chat_messages 
                     WHERE conversation_id = c.id 
                     ORDER BY created_at DESC LIMIT 1) as preview
                FROM gold.chat_conversations c
                LEFT JOIN gold.chat_messages m ON m.conversation_id = c.id
                WHERE c.user_id = :user_id
                GROUP BY c.id
                ORDER BY c.updated_at DESC
                LIMIT :limit
            """),
            {"user_id": user_id, "limit": limit}
        )
        
        conversations = []
        for row in result:
            conversations.append(ConversationResponse(
                conversation_id=str(row[0]),
                user_id=str(row[1]) if row[1] else None,
                created_at=row[2].isoformat() if row[2] else None,
                updated_at=row[3].isoformat() if row[3] else None,
                message_count=row[4] or 0,
                preview=row[5][:100] + "..." if row[5] and len(row[5]) > 100 else row[5]
            ))
        
        return conversations
        
    except Exception as e:
        logger.error(f"Error getting conversations: {e}")
        return []


@router.get("/conversation/{conversation_id}", response_model=List[MessageResponse])
async def get_conversation_messages(
    conversation_id: str,
    user_id: Optional[str] = Depends(get_current_user_id_optional),
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get messages for a specific conversation
    """
    try:
        ensure_chat_tables(db)
        
        messages = get_conversation_history(db, conversation_id, limit)
        
        return [
            MessageResponse(
                id=msg["id"],
                conversation_id=conversation_id,
                role=msg["role"],
                content=msg["content"],
                created_at=msg["created_at"],
                vehicles=msg.get("vehicles", [])
            )
            for msg in messages
        ]
        
    except Exception as e:
        logger.error(f"Error getting messages: {e}")
        return []


@router.delete("/conversation/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user_id_optional),
    db: Session = Depends(get_db)
):
    """
    Delete a conversation
    """
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        # Verify ownership
        result = db.execute(
            text("SELECT user_id FROM gold.chat_conversations WHERE id = :id"),
            {"id": conversation_id}
        ).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if str(result[0]) != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Delete (cascade will handle messages)
        db.execute(
            text("DELETE FROM gold.chat_conversations WHERE id = :id"),
            {"id": conversation_id}
        )
        db.commit()
        
        return {"message": "Conversation deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def chat_health():
    """Health check for chat service"""
    try:
        from app.services.chatbot.core import initialize_chatbot
        chatbot = initialize_chatbot()
        return {"status": "healthy", "chatbot": "initialized"}
    except Exception as e:
        return {"status": "degraded", "error": str(e)}
