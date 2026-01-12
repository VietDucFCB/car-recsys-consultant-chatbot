"""
Temporal Workflows for Chatbot Orchestration
"""
import logging
from datetime import timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import uuid

from temporalio import workflow, activity
from temporalio.common import RetryPolicy

logger = logging.getLogger(__name__)


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class ConversationState:
    """State of a conversation"""
    conversation_id: str
    user_id: Optional[str]
    messages: List[Dict[str, Any]]
    created_at: str
    updated_at: str
    metadata: Dict[str, Any]


@dataclass
class ChatTurnInput:
    """Input for a chat turn"""
    conversation_id: str
    user_id: Optional[str]
    message: str
    session_id: str


@dataclass
class ChatTurnOutput:
    """Output of a chat turn"""
    conversation_id: str
    response: str
    vehicles: List[Dict[str, Any]]
    metadata: Dict[str, Any]


# =============================================================================
# ACTIVITIES
# =============================================================================

@activity.defn
async def validate_input_activity(message: str) -> bool:
    """Validate user input"""
    if not message or not message.strip():
        return False
    if len(message) > 5000:
        return False
    return True


@activity.defn
async def load_history_activity(conversation_id: str) -> List[Dict[str, Any]]:
    """Load conversation history from PostgreSQL"""
    from app.core.database import get_db
    from sqlalchemy import text
    
    # Get database session
    db = next(get_db())
    try:
        result = db.execute(
            text("""
                SELECT role, content, created_at
                FROM gold.chat_messages
                WHERE conversation_id = :conv_id
                ORDER BY created_at ASC
                LIMIT 20
            """),
            {"conv_id": conversation_id}
        )
        
        messages = []
        for row in result:
            messages.append({
                "role": row[0],
                "content": row[1],
                "created_at": row[2].isoformat() if row[2] else None
            })
        
        return messages
    finally:
        db.close()


@activity.defn
async def retrieve_memory_activity(
    query: str,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """Retrieve relevant context from Qdrant vector store"""
    from app.services.chatbot.core import initialize_chatbot
    
    chatbot = initialize_chatbot()
    vehicles = chatbot.search_vehicles(query, limit=limit)
    return vehicles


@activity.defn
async def call_llm_activity(
    history: List[Dict[str, Any]],
    user_message: str,
    context: str
) -> str:
    """Call LLM to generate response"""
    from app.services.chatbot.core import initialize_chatbot
    from langchain_core.messages import HumanMessage, AIMessage
    
    chatbot = initialize_chatbot()
    
    # Convert history to LangChain messages
    chat_history = []
    for msg in history:
        if msg["role"] == "user":
            chat_history.append(HumanMessage(content=msg["content"]))
        else:
            chat_history.append(AIMessage(content=msg["content"]))
    
    response, _, _ = chatbot.generate_response(chat_history, user_message)
    return response


@activity.defn
async def persist_message_activity(
    conversation_id: str,
    role: str,
    content: str,
    user_id: Optional[str] = None
) -> bool:
    """Persist message to PostgreSQL"""
    from app.core.database import get_db
    from sqlalchemy import text
    
    db = next(get_db())
    try:
        db.execute(
            text("""
                INSERT INTO gold.chat_messages 
                (conversation_id, user_id, role, content, created_at)
                VALUES (:conv_id, :user_id, :role, :content, NOW())
            """),
            {
                "conv_id": conversation_id,
                "user_id": user_id,
                "role": role,
                "content": content
            }
        )
        db.commit()
        return True
    except Exception as e:
        logger.error(f"Error persisting message: {e}")
        db.rollback()
        return False
    finally:
        db.close()


@activity.defn
async def trigger_embedding_activity(
    conversation_id: str,
    message: str,
) -> bool:
    """Trigger async embedding generation for conversation context"""
    # This could be used to update conversation embeddings for future retrieval
    # For now, we just log it
    logger.info(f"Embedding trigger for conversation {conversation_id}")
    return True


# =============================================================================
# WORKFLOWS
# =============================================================================

@workflow.defn
class StartConversationWorkflow:
    """Workflow to start a new conversation"""
    
    @workflow.run
    async def run(self, user_id: Optional[str] = None) -> ConversationState:
        """Create a new conversation"""
        import datetime
        
        conversation_id = str(uuid.uuid4())
        now = datetime.datetime.utcnow().isoformat()
        
        state = ConversationState(
            conversation_id=conversation_id,
            user_id=user_id,
            messages=[],
            created_at=now,
            updated_at=now,
            metadata={}
        )
        
        return state


@workflow.defn
class ChatTurnWorkflow:
    """Workflow for processing a single chat turn"""
    
    @workflow.run
    async def run(self, input: ChatTurnInput) -> ChatTurnOutput:
        """Process a chat turn"""
        
        retry_policy = RetryPolicy(
            initial_interval=timedelta(seconds=1),
            maximum_interval=timedelta(seconds=10),
            maximum_attempts=3,
        )
        
        # 1. Validate input
        is_valid = await workflow.execute_activity(
            validate_input_activity,
            input.message,
            start_to_close_timeout=timedelta(seconds=5),
            retry_policy=retry_policy,
        )
        
        if not is_valid:
            return ChatTurnOutput(
                conversation_id=input.conversation_id,
                response="I couldn't understand your message. Could you please rephrase?",
                vehicles=[],
                metadata={"error": "invalid_input"}
            )
        
        # 2. Load history from PostgreSQL
        history = await workflow.execute_activity(
            load_history_activity,
            input.conversation_id,
            start_to_close_timeout=timedelta(seconds=10),
            retry_policy=retry_policy,
        )
        
        # 3. Retrieve relevant vehicles from Qdrant
        vehicles = await workflow.execute_activity(
            retrieve_memory_activity,
            args=[input.message, 10],
            start_to_close_timeout=timedelta(seconds=30),
            retry_policy=retry_policy,
        )
        
        # 4. Format context
        context = "\n".join([
            f"Vehicle: {v.get('metadata', {}).get('title', 'Unknown')}"
            for v in vehicles
        ])
        
        # 5. Call LLM
        response = await workflow.execute_activity(
            call_llm_activity,
            args=[history, input.message, context],
            start_to_close_timeout=timedelta(seconds=60),
            retry_policy=retry_policy,
        )
        
        # 6. Persist user message
        await workflow.execute_activity(
            persist_message_activity,
            args=[input.conversation_id, "user", input.message, input.user_id],
            start_to_close_timeout=timedelta(seconds=10),
            retry_policy=retry_policy,
        )
        
        # 7. Persist assistant response
        await workflow.execute_activity(
            persist_message_activity,
            args=[input.conversation_id, "assistant", response, None],
            start_to_close_timeout=timedelta(seconds=10),
            retry_policy=retry_policy,
        )
        
        # 8. Trigger embedding (async, don't wait)
        workflow.start_activity(
            trigger_embedding_activity,
            args=[input.conversation_id, input.message],
            start_to_close_timeout=timedelta(seconds=30),
        )
        
        return ChatTurnOutput(
            conversation_id=input.conversation_id,
            response=response,
            vehicles=vehicles[:5],  # Return top 5 vehicles
            metadata={"message_count": len(history) + 2}
        )


# Export workflows
ChatWorkflow = ChatTurnWorkflow
