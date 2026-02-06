import React, { createContext, useContext, useReducer, useCallback } from "react";
import { generateSessionId } from "@/services/api";
import { getEligibleSchemes } from "@/data/schemes";

// Initial state
const initialState = {
  sessionId: generateSessionId(),
  view: "home", // home, chat, results
  userProfile: {
    age: null,
    income: null,
    state: null,
    category: null,
  },
  messages: [],
  eligibleSchemes: [],
  isTyping: false,
  currentQuestion: "age", // age, income, state, category, complete
  selectedScheme: null,
  isSMSModalOpen: false,
};

// Action types
const actionTypes = {
  SET_VIEW: "SET_VIEW",
  SET_USER_PROFILE: "SET_USER_PROFILE",
  ADD_MESSAGE: "ADD_MESSAGE",
  SET_MESSAGES: "SET_MESSAGES",
  SET_TYPING: "SET_TYPING",
  SET_CURRENT_QUESTION: "SET_CURRENT_QUESTION",
  SET_ELIGIBLE_SCHEMES: "SET_ELIGIBLE_SCHEMES",
  SET_SELECTED_SCHEME: "SET_SELECTED_SCHEME",
  SET_SMS_MODAL_OPEN: "SET_SMS_MODAL_OPEN",
  RESET: "RESET",
};

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    case actionTypes.SET_VIEW:
      return { ...state, view: action.payload };
    case actionTypes.SET_USER_PROFILE:
      return { ...state, userProfile: { ...state.userProfile, ...action.payload } };
    case actionTypes.ADD_MESSAGE:
      return { ...state, messages: [...state.messages, action.payload] };
    case actionTypes.SET_MESSAGES:
      return { ...state, messages: action.payload };
    case actionTypes.SET_TYPING:
      return { ...state, isTyping: action.payload };
    case actionTypes.SET_CURRENT_QUESTION:
      return { ...state, currentQuestion: action.payload };
    case actionTypes.SET_ELIGIBLE_SCHEMES:
      return { ...state, eligibleSchemes: action.payload };
    case actionTypes.SET_SELECTED_SCHEME:
      return { ...state, selectedScheme: action.payload };
    case actionTypes.SET_SMS_MODAL_OPEN:
      return { ...state, isSMSModalOpen: action.payload };
    case actionTypes.RESET:
      return { ...initialState, sessionId: generateSessionId() };
    default:
      return state;
  }
}

// Context
const AppContext = createContext(null);

// Provider component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Actions
  const setView = useCallback((view) => {
    dispatch({ type: actionTypes.SET_VIEW, payload: view });
  }, []);

  const setUserProfile = useCallback((profile) => {
    dispatch({ type: actionTypes.SET_USER_PROFILE, payload: profile });
  }, []);

  const addMessage = useCallback((message) => {
    dispatch({ type: actionTypes.ADD_MESSAGE, payload: { ...message, id: Date.now() } });
  }, []);

  const setTyping = useCallback((isTyping) => {
    dispatch({ type: actionTypes.SET_TYPING, payload: isTyping });
  }, []);

  const setCurrentQuestion = useCallback((question) => {
    dispatch({ type: actionTypes.SET_CURRENT_QUESTION, payload: question });
  }, []);

  const checkAndSetEligibleSchemes = useCallback((profile) => {
    const schemes = getEligibleSchemes(profile);
    dispatch({ type: actionTypes.SET_ELIGIBLE_SCHEMES, payload: schemes });
    return schemes;
  }, []);

  const openSMSModal = useCallback((scheme) => {
    dispatch({ type: actionTypes.SET_SELECTED_SCHEME, payload: scheme });
    dispatch({ type: actionTypes.SET_SMS_MODAL_OPEN, payload: true });
  }, []);

  const closeSMSModal = useCallback(() => {
    dispatch({ type: actionTypes.SET_SMS_MODAL_OPEN, payload: false });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: actionTypes.RESET });
  }, []);

  const value = {
    ...state,
    setView,
    setUserProfile,
    addMessage,
    setTyping,
    setCurrentQuestion,
    checkAndSetEligibleSchemes,
    openSMSModal,
    closeSMSModal,
    reset,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook to use context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
