import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AppProvider, useApp } from "@/context/AppContext";
import { HeroSection } from "@/components/HeroSection";
import { ChatView } from "@/components/ChatView";
import { SMSModal } from "@/components/SMSModal";
import { sendSMS } from "@/services/api";
import { WavyBackground } from "@/components/ui/wavy-background";
import { FloatingDock } from "@/components/ui/floating-dock";
import { Home, MessageSquare, Mic, Search } from "lucide-react";

// Main App Content (inside provider)
function AppContent() {
  const {
    view,
    setView,
    isSMSModalOpen,
    closeSMSModal,
    selectedScheme,
  } = useApp();

  const handleStartVoice = () => {
    setView("chat");
  };

  const handleStartChat = () => {
    setView("chat");
  };

  const handleSendSMS = async ({ phone, schemeId }) => {
    const result = await sendSMS(phone, schemeId);
    return result;
  };

  // Dock items configuration
  const dockItems = [
    { title: "Home", icon: Home, view: "home" },
    { title: "Chat", icon: MessageSquare, view: "chat" },
    { title: "Voice", icon: Mic, view: "chat" },
    { title: "Schemes", icon: Search, view: "results" }, // Future: dedicated results view
  ];

  return (
    <WavyBackground 
      className="min-h-screen max-w-4xl mx-auto flex flex-col" 
      containerClassName="min-h-screen bg-black" 
      colors={["#FF9933", "#FFFFFF", "#138808", "#000080"]} 
      waveWidth={100} 
      blur={5}
      backgroundFill="#020617"
    >
      <AnimatePresence mode="wait">
        {view === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full flex-grow"
          >
            <HeroSection
              onStartVoice={handleStartVoice}
              onStartChat={handleStartChat}
            />
          </motion.div>
        )}

        {view === "chat" && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="h-full flex-grow w-full"
          >
            <ChatView />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Navigation Dock */}
      <div className="absolute bottom-10 left-0 right-0 z-50 flex justify-center">
        <FloatingDock 
          items={dockItems} 
          currentView={view} 
          onViewChange={setView} 
        />
      </div>

      {/* SMS Modal */}
      <SMSModal
        isOpen={isSMSModalOpen}
        onClose={closeSMSModal}
        scheme={selectedScheme}
        onSend={handleSendSMS}
      />
    </WavyBackground>
  );
}

// Root App with Provider
function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
