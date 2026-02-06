// API service for backend communication
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Generate unique session ID
export const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Chat API
export const sendChatMessage = async (sessionId, message, userProfile = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        message,
        user_profile: userProfile,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get response from chat API");
    }

    return await response.json();
  } catch (error) {
    console.error("Chat API error:", error);
    // Return mock response for demo
    return {
      response: getMockResponse(message, userProfile),
      schemes: [],
      next_question: null,
    };
  }
};

// Eligibility check API
export const checkEligibilityAPI = async (userProfile) => {
  try {
    const response = await fetch(`${API_BASE_URL}/eligibility`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userProfile),
    });

    if (!response.ok) {
      throw new Error("Failed to check eligibility");
    }

    return await response.json();
  } catch (error) {
    console.error("Eligibility API error:", error);
    throw error;
  }
};

// SMS API
export const sendSMS = async (phone, schemeId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone,
        scheme_id: schemeId,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to send SMS");
    }

    return await response.json();
  } catch (error) {
    console.error("SMS API error:", error);
    // Simulate success for demo
    return { status: "sent", message: "SMS sent successfully (demo mode)" };
  }
};

// Health check
export const checkHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await response.json();
  } catch (error) {
    return { status: "offline", error: error.message };
  }
};

// Mock response generator for demo mode
const getMockResponse = (message, userProfile) => {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("scholarship") || lowerMessage.includes("scheme") || lowerMessage.includes("help")) {
    if (!userProfile.age) {
      return "I'd love to help you find scholarships! First, could you tell me your age?";
    }
    if (!userProfile.income) {
      return `Great! You're ${userProfile.age} years old. What is your family's annual income (approximately)?`;
    }
    if (!userProfile.state) {
      return "Thanks! Which state do you live in?";
    }
    if (!userProfile.category) {
      return "Almost done! What is your category? (General, SC, ST, OBC, EWS, or Minority)";
    }
    return "Perfect! I've found some schemes you may be eligible for. Let me show you the results.";
  }

  if (lowerMessage.includes("hello") || lowerMessage.includes("hi") || lowerMessage.includes("hey")) {
    return "Hello! 👋 Welcome to BharatConnect AI. I can help you discover government scholarships you're eligible for. Just say 'find scholarships' or tell me what you're looking for!";
  }

  return "I'm here to help you find government scholarships. Try saying 'I need a scholarship' or 'Help me find schemes'.";
};
