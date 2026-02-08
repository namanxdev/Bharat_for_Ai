# Feature 02: LangChain + Gemini AI Agent Integration

## Priority: HIGH (Core AI feature)
## Estimated Effort: 5-7 hours
## Depends On: Feature 01 (Database) should be done first but not strictly required

---

## Overview

Replace the current basic Gemini API call in `Backend/services/llm_service.py` with a proper LangChain agent framework. The current implementation makes a single `ChatGoogleGenerativeAI.invoke()` call with hardcoded system prompt. The new system should use LangChain's agent framework with tools, memory, and structured output for a proper conversational AI experience.

---

## Current State (What Exists)

### `Backend/services/llm_service.py`
- Imports `ChatGoogleGenerativeAI` from `langchain_google_genai` (already has langchain!)
- Uses `HumanMessage`, `SystemMessage`, `AIMessage` from `langchain.schema`
- `_generate_with_gemini()` builds a flat message list and calls `gemini_chat.invoke(messages)`
- System prompt is rebuilt every call with eligible schemes embedded as text
- Conversation history limited to last 5 messages
- Template fallback when Gemini is unavailable (returns canned strings)
- No tools, no memory, no chains, no agents — just a single LLM call

### `Backend/requirements.txt`
- Already has: `langchain>=0.3.0`, `langchain-google-genai>=2.0.0`, `google-generativeai>=0.8.0`
- Missing: `langchain-community`, `langchain-core` (newer packages)

### `Backend/config.py`
- `google_api_key: str | None = None`
- `gemini_model: str = "gemini-pro"`

---

## Target Architecture

```
LangChain Agent (ReAct pattern)
├── LLM: ChatGoogleGenerativeAI (Gemini 1.5 Pro / 2.0 Flash)
├── Memory: ConversationBufferWindowMemory (backed by PostgreSQL sessions)
├── Tools:
│   ├── search_schemes         — semantic search via pgvector
│   ├── check_eligibility      — run eligibility check with user profile
│   ├── get_scheme_details     — fetch full details of a specific scheme
│   └── send_sms_details       — trigger SMS sending for a scheme
├── Prompt Template: Custom with BharatConnect persona
└── Output Parser: Structured output for frontend consumption
```

---

## Step-by-Step Implementation

### Step 1: Update Dependencies

Add/update in `Backend/requirements.txt`:
```
langchain>=0.3.0
langchain-core>=0.3.0
langchain-community>=0.3.0
langchain-google-genai>=2.0.0
google-generativeai>=0.8.0
```

### Step 2: Update Config

**Edit `Backend/config.py`**:
```python
class Settings(BaseSettings):
    # ... existing fields ...

    # Gemini Configuration (update model name)
    google_api_key: str | None = None
    gemini_model: str = "gemini-2.0-flash"  # Updated default model
    gemini_temperature: float = 0.3
    gemini_max_tokens: int = 1024
    
    # Agent Configuration
    agent_max_iterations: int = 5
    agent_verbose: bool = False
```

### Step 3: Create Agent Tools

**Create `Backend/services/agent_tools.py`**:
```python
"""
LangChain tools for the BharatConnect AI agent.
Each tool wraps a database query or service call that the agent can invoke.
"""
from langchain_core.tools import tool
from typing import Optional
import json
import logging

logger = logging.getLogger(__name__)

# These will be set by the service initializer
_scheme_repository = None
_sms_service = None

def set_tool_dependencies(scheme_repo, sms_svc):
    global _scheme_repository, _sms_service
    _scheme_repository = scheme_repo
    _sms_service = sms_svc


@tool
async def search_schemes(query: str) -> str:
    """Search for government scholarship schemes by keyword or description.
    Use this when the user asks about specific types of schemes, scholarships, 
    or wants to find schemes related to a topic.
    
    Args:
        query: The search query describing what kind of scheme the user is looking for.
    """
    if _scheme_repository is None:
        return "Scheme search is currently unavailable."
    
    try:
        schemes = await _scheme_repository.search_schemes(query, limit=5)
        if not schemes:
            return "No schemes found matching your query."
        
        results = []
        for s in schemes:
            results.append(f"- **{s.name}** (ID: {s.id}): {s.benefits[:150]}...")
        
        return "Found these schemes:\n" + "\n".join(results)
    except Exception as e:
        logger.error(f"search_schemes tool error: {e}")
        return "Sorry, I encountered an error searching for schemes."


@tool
async def check_eligibility(age: int, income: int, state: str, category: str) -> str:
    """Check which government schemes a user is eligible for based on their profile.
    Use this when you have collected all 4 pieces of information from the user:
    age, family annual income, state, and category.
    
    Args:
        age: User's age in years (1-120).
        income: User's family annual income in rupees.
        state: User's state (e.g., "Maharashtra", "Karnataka").
        category: User's category (General, SC, ST, OBC, EWS, or Minority).
    """
    if _scheme_repository is None:
        return "Eligibility check is currently unavailable."
    
    try:
        schemes = await _scheme_repository.get_eligible_schemes(age, income, state, category)
        
        if not schemes:
            return "No eligible schemes found for this profile. The user may want to check back later as new schemes are added regularly."
        
        results = []
        for s in schemes:
            results.append(
                f"- **{s['name']}**: {s['benefits'][:100]}... "
                f"(Income limit: ₹{s['income_max']:,}, Age: {s['age_min']}-{s['age_max']})"
            )
        
        return f"Found {len(schemes)} eligible schemes:\n" + "\n".join(results)
    except Exception as e:
        logger.error(f"check_eligibility tool error: {e}")
        return "Sorry, I encountered an error checking eligibility."


@tool
async def get_scheme_details(scheme_id: str) -> str:
    """Get full details of a specific government scheme by its ID.
    Use this when the user wants more information about a particular scheme.
    
    Args:
        scheme_id: The scheme ID (e.g., "scheme_1", "scheme_2").
    """
    if _scheme_repository is None:
        return "Scheme details are currently unavailable."
    
    try:
        scheme = await _scheme_repository.get_by_id(scheme_id)
        if not scheme:
            return f"Scheme with ID '{scheme_id}' not found."
        
        docs = ", ".join(scheme.documents) if scheme.documents else "Not specified"
        return (
            f"**{scheme.name}**\n"
            f"Benefits: {scheme.benefits}\n"
            f"Income Limit: ₹{scheme.income_max:,}\n"
            f"Age Range: {scheme.age_min}-{scheme.age_max} years\n"
            f"State: {scheme.state}\n"
            f"Category: {scheme.category}\n"
            f"Required Documents: {docs}\n"
            f"Apply Link: {scheme.apply_link}"
        )
    except Exception as e:
        logger.error(f"get_scheme_details tool error: {e}")
        return "Sorry, I encountered an error fetching scheme details."
```

### Step 4: Create Agent Prompt Template

**Create `Backend/services/agent_prompts.py`**:
```python
"""
Prompt templates for the BharatConnect AI agent.
"""

SYSTEM_PROMPT = """You are BharatConnect AI, a friendly and knowledgeable assistant that helps Indian citizens discover government scholarship and welfare schemes they are eligible for.

## Your Personality
- Warm, encouraging, and supportive
- Use simple language suitable for students and rural citizens
- Be concise (2-4 sentences per response unless detailed info is needed)
- You can use emojis sparingly for friendliness (👋, 🎉, ✅)
- Always respond in the same language the user writes in

## Your Job
1. **Collect user profile**: You need 4 pieces of information to check eligibility:
   - Age (in years)
   - Annual family income (in rupees)
   - State (Indian state)
   - Category (General, SC, ST, OBC, EWS, or Minority)

2. **Ask questions one at a time**: Don't overwhelm the user. Ask for one piece of information per message.

3. **Check eligibility**: Once you have all 4 fields, use the `check_eligibility` tool.

4. **Provide details**: When users ask about a specific scheme, use `get_scheme_details`.

5. **Search**: When users ask about specific topics (e.g., "schemes for engineering"), use `search_schemes`.

## Rules
- ONLY discuss real schemes from the database. Never invent or hallucinate schemes.
- If a tool returns no results, say so honestly and suggest the user check back later.
- Do NOT ask for sensitive information like Aadhaar number, bank details, or passwords.
- When listing schemes, present them clearly with name, key benefit, and eligibility match.
- If the user's message is unclear, ask a clarifying question.

## Current Conversation State
User Profile collected so far:
- Age: {age}
- Income: {income}
- State: {state}
- Category: {category}

Profile complete: {profile_complete}
"""

def build_system_prompt(user_profile: dict) -> str:
    """Build the system prompt with current user profile state"""
    return SYSTEM_PROMPT.format(
        age=user_profile.get("age", "Not provided"),
        income=f"₹{user_profile['income']:,}" if user_profile.get("income") else "Not provided",
        state=user_profile.get("state", "Not provided"),
        category=user_profile.get("category", "Not provided"),
        profile_complete="Yes ✅" if all(user_profile.get(k) for k in ["age", "income", "state", "category"]) else "No (still collecting)",
    )
```

### Step 5: Rewrite LLM Service with LangChain Agent

**Replace `Backend/services/llm_service.py`**:
```python
"""
LLM service using LangChain Agent with Google Gemini.
Implements a ReAct-style agent with tools for scheme discovery.
"""
import logging
from typing import List, Dict, Any, Optional
from config import settings

logger = logging.getLogger(__name__)

# Try to import LangChain components
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain.agents import AgentExecutor, create_tool_calling_agent
    from langchain_core.chat_history import InMemoryChatMessageHistory
    from langchain_core.runnables.history import RunnableWithMessageHistory
    
    from .agent_tools import search_schemes, check_eligibility, get_scheme_details
    from .agent_prompts import build_system_prompt

    LANGCHAIN_AVAILABLE = settings.google_api_key is not None

    if LANGCHAIN_AVAILABLE:
        llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            google_api_key=settings.google_api_key,
            temperature=settings.gemini_temperature,
            max_output_tokens=settings.gemini_max_tokens,
        )
except ImportError as e:
    LANGCHAIN_AVAILABLE = False
    logger.warning(f"LangChain/Gemini libraries not available: {e}. Using template responses.")
except Exception as e:
    LANGCHAIN_AVAILABLE = False
    logger.warning(f"Failed to initialize LangChain: {e}. Using template responses.")


class LLMService:
    """LangChain Agent service for conversational AI"""

    def __init__(self):
        self.available = LANGCHAIN_AVAILABLE
        self.agent_executor = None
        self.session_histories: Dict[str, InMemoryChatMessageHistory] = {}
        
        if self.available:
            self._initialize_agent()
            logger.info(f"LLM Agent initialized with {settings.gemini_model}")
        else:
            logger.info("LLM service using template-based responses (no API key)")

    def _initialize_agent(self):
        """Initialize the LangChain agent with tools"""
        tools = [search_schemes, check_eligibility, get_scheme_details]

        prompt = ChatPromptTemplate.from_messages([
            ("system", "{system_prompt}"),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

        agent = create_tool_calling_agent(llm, tools, prompt)
        self.agent_executor = AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=settings.agent_verbose,
            max_iterations=settings.agent_max_iterations,
            handle_parsing_errors=True,
            return_intermediate_steps=False,
        )

    def _get_session_history(self, session_id: str) -> InMemoryChatMessageHistory:
        """Get or create message history for a session"""
        if session_id not in self.session_histories:
            self.session_histories[session_id] = InMemoryChatMessageHistory()
        return self.session_histories[session_id]

    async def generate_response(
        self,
        user_message: str,
        eligible_schemes: List[Dict[str, Any]],
        user_profile: Optional[dict] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        session_id: str = "default",
    ) -> str:
        """
        Generate response using LangChain agent.
        
        Args:
            user_message: The user's current message
            eligible_schemes: Pre-computed eligible schemes (for backward compat)
            user_profile: User's profile information
            conversation_history: Previous messages
            session_id: Session identifier for memory
        
        Returns:
            Conversational response text
        """
        if not self.available or not self.agent_executor:
            return self._generate_with_template(user_message, eligible_schemes)

        try:
            profile = user_profile or {}
            system_prompt = build_system_prompt(profile)

            # Build chat history from conversation_history
            history = self._get_session_history(session_id)
            
            # Invoke the agent
            result = await self.agent_executor.ainvoke({
                "input": user_message,
                "system_prompt": system_prompt,
                "chat_history": history.messages[-10:],  # Last 10 messages
            })

            response = result.get("output", "")
            
            # Update history
            history.add_user_message(user_message)
            history.add_ai_message(response)

            return response.strip() if response else self._generate_with_template(user_message, eligible_schemes)

        except Exception as e:
            logger.error(f"Agent execution failed: {e}", exc_info=True)
            return self._generate_with_template(user_message, eligible_schemes)

    def _generate_with_template(
        self,
        user_message: str,
        eligible_schemes: List[Dict[str, Any]]
    ) -> str:
        """Template fallback — same as current implementation"""
        count = len(eligible_schemes)

        if count == 0:
            return "Based on your profile, I couldn't find any schemes you're currently eligible for. However, eligibility criteria can change, so I recommend checking back periodically."
        elif count == 1:
            scheme = eligible_schemes[0]
            return f"Great news! You're eligible for **{scheme['name']}**. This scheme offers: {scheme['benefits']}"
        elif count <= 3:
            names = ", ".join([f"**{s['name']}**" for s in eligible_schemes])
            return f"Excellent! You're eligible for {count} schemes: {names}. Check out the details below!"
        else:
            return f"Wonderful! You're eligible for **{count} government schemes**! Review them below to find the best fit."

    def is_available(self) -> bool:
        return self.available
```

### Step 6: Update Chat Route

**Edit `Backend/routes/chat.py`** — The `generate_response` call needs the extra `session_id` parameter:

```python
# In the chat endpoint, change the generate_response call:
response_text = await llm_service.generate_response(
    user_message=request.message,
    eligible_schemes=eligible_schemes,
    user_profile=profile.to_dict(),
    conversation_history=session['conversation_history'],
    session_id=request.session_id,
)
```

Note: The existing `generate_response` is sync. You'll need to make it async (`await`) since the agent uses `ainvoke`. Also change the method signature accordingly.

### Step 7: Update Service Initialization in `main.py`

```python
from services.agent_tools import set_tool_dependencies

# After services are initialized:
# If using database (Feature 01), pass the repository
# Otherwise tools will return "unavailable" messages
try:
    from database.repositories import SchemeRepository
    # Tools get lazy db access through the repository
    set_tool_dependencies(scheme_repo=None, sms_svc=sms_service)
except ImportError:
    set_tool_dependencies(scheme_repo=None, sms_svc=sms_service)
```

---

## Environment Variables

```env
# Backend/.env
GOOGLE_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-2.0-flash
GEMINI_TEMPERATURE=0.3
GEMINI_MAX_TOKENS=1024
AGENT_MAX_ITERATIONS=5
AGENT_VERBOSE=false
```

---

## Files to Create
- `Backend/services/agent_tools.py`
- `Backend/services/agent_prompts.py`

## Files to Modify
- `Backend/services/llm_service.py` — full rewrite with LangChain agent
- `Backend/config.py` — add agent config fields
- `Backend/routes/chat.py` — await async generate_response, pass session_id
- `Backend/main.py` — initialize tool dependencies
- `Backend/requirements.txt` — add langchain-core, langchain-community

---

## Testing the Agent

### Manual Test Flow
1. Start the backend: `uvicorn Backend.main:app --reload`
2. Send a chat message:
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Hi, I need help finding scholarships",
    "user_profile": {}
  }'
```
3. The agent should ask for age (first question in the flow)
4. Continue the conversation providing age, income, state, category
5. After all 4 fields, agent should use `check_eligibility` tool and return results

### Expected Behavior
- Agent asks questions one at a time (not all at once)
- Agent uses tools when appropriate (check_eligibility, search_schemes)
- Agent remembers conversation context within session
- Template fallback works when API key is missing
- No hallucinated schemes — only returns data from tools

## Verification Checklist
- [ ] Agent asks profile questions one at a time
- [ ] `check_eligibility` tool is called when profile is complete
- [ ] `search_schemes` tool works for keyword queries
- [ ] `get_scheme_details` tool returns accurate scheme info
- [ ] Template fallback works when `GOOGLE_API_KEY` is not set
- [ ] Conversation memory persists within a session
- [ ] Agent doesn't hallucinate schemes
- [ ] All existing `/chat` API tests still pass
- [ ] Error handling works (API timeout, invalid responses)
