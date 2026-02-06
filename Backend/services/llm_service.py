"""
LLM service for generating conversational responses
Supports Google Gemini with LangChain and fallback to template-based responses
"""
import logging
from typing import List, Dict, Any, Optional
from ..config import settings

logger = logging.getLogger(__name__)

# Try to import Gemini and LangChain
try:
    import google.generativeai as genai
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain.schema import HumanMessage, SystemMessage, AIMessage

    GEMINI_AVAILABLE = settings.google_api_key is not None

    if GEMINI_AVAILABLE:
        genai.configure(api_key=settings.google_api_key)
        gemini_chat = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.google_api_key,
            temperature=0.3,
            max_output_tokens=500
        )
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("Gemini/LangChain libraries not available. Using template-based responses.")
except Exception as e:
    GEMINI_AVAILABLE = False
    logger.warning(f"Failed to initialize Gemini: {e}. Using template-based responses.")


class LLMService:
    """Service for generating conversational responses using LLM or templates"""

    def __init__(self):
        self.available = GEMINI_AVAILABLE
        if self.available:
            logger.info(f"LLM service initialized with Google Gemini ({settings.gemini_model})")
        else:
            logger.info("LLM service using template-based responses")

    def generate_response(
        self,
        user_message: str,
        eligible_schemes: List[Dict[str, Any]],
        user_profile: Optional[dict] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Generate a conversational response

        Args:
            user_message: The user's current message
            eligible_schemes: List of schemes the user is eligible for
            user_profile: User's profile information
            conversation_history: Previous conversation messages

        Returns:
            Conversational response text
        """
        if self.available:
            return self._generate_with_gemini(
                user_message, eligible_schemes, user_profile, conversation_history
            )
        else:
            return self._generate_with_template(user_message, eligible_schemes)

    def _generate_with_gemini(
        self,
        user_message: str,
        eligible_schemes: List[Dict[str, Any]],
        user_profile: Optional[dict],
        conversation_history: Optional[List[Dict[str, str]]]
    ) -> str:
        """Generate response using Google Gemini via LangChain"""
        try:
            # Build system prompt
            system_prompt = self._build_system_prompt(eligible_schemes)

            # Build message history for LangChain
            messages = [SystemMessage(content=system_prompt)]

            if conversation_history:
                for msg in conversation_history[-5:]:  # Last 5 messages for context
                    if msg["role"] == "user":
                        messages.append(HumanMessage(content=msg["content"]))
                    elif msg["role"] == "assistant":
                        messages.append(AIMessage(content=msg["content"]))

            messages.append(HumanMessage(content=user_message))

            # Call Gemini via LangChain
            response = gemini_chat.invoke(messages)

            return response.content.strip()

        except Exception as e:
            logger.error(f"Gemini API call failed: {e}. Falling back to template.")
            return self._generate_with_template(user_message, eligible_schemes)

    def _generate_with_template(
        self,
        user_message: str,
        eligible_schemes: List[Dict[str, Any]]
    ) -> str:
        """Generate response using templates (no LLM required)"""
        count = len(eligible_schemes)

        if count == 0:
            return "Based on your profile, I couldn't find any schemes you're currently eligible for. However, eligibility criteria can change, so I recommend checking back periodically or exploring options to meet the requirements for specific schemes."

        elif count == 1:
            scheme = eligible_schemes[0]
            return f"Great news! You're eligible for **{scheme['name']}**. This scheme offers: {scheme['benefits']}"

        elif count <= 3:
            scheme_names = ", ".join([f"**{s['name']}**" for s in eligible_schemes])
            return f"Excellent! You're eligible for {count} schemes: {scheme_names}. Each scheme has unique benefits tailored to your needs. Check out the details below!"

        else:
            return f"Wonderful! You're eligible for **{count} government schemes**! This gives you multiple options to choose from based on your specific educational goals. Review the schemes below to see which ones align best with your needs."

    def _build_system_prompt(self, eligible_schemes: List[Dict[str, Any]]) -> str:
        """Build system prompt with scheme information"""
        scheme_info = "\n\n".join([
            f"Scheme: {s['name']}\nBenefits: {s['benefits']}"
            for s in eligible_schemes[:5]  # Limit to 5 schemes to keep prompt concise
        ])

        return f"""You are BharatConnect AI, a helpful assistant for Indian government scholarship schemes.

Your role:
- Help users understand which schemes they're eligible for
- Explain scheme benefits clearly and concisely
- Guide users through the application process
- Be encouraging and supportive

Important guidelines:
- ONLY discuss the schemes provided below - do not make up or hallucinate schemes
- Keep responses conversational and friendly
- Use simple language suitable for students
- Be concise (2-3 sentences maximum)

Eligible schemes for this user:
{scheme_info}

Current context: The user is eligible for {len(eligible_schemes)} scheme(s).
"""

    def is_available(self) -> bool:
        """Check if LLM service is available"""
        return self.available
