"""
Chatbot Service - Car Shopping Assistant
Uses Qdrant for vector storage and OpenAI for LLM
"""
from .core import ChatbotCore, initialize_chatbot

__all__ = ["ChatbotCore", "initialize_chatbot"]
