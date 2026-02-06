import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Spotlight } from "@/components/ui/spotlight";
import { TextGenerateEffect, TypewriterEffect } from "@/components/ui/text-effects";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { BlurFade } from "@/components/ui/animated-list";
import { Mic, MessageSquare, Sparkles } from "lucide-react";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";

export const HeroSection = ({ onStartVoice, onStartChat, className }) => {
  const typewriterWords = [
    { text: "scholarships" },
    { text: "grants" },
    { text: "subsidies" },
    { text: "schemes" },
  ];

  return (
    <div
      className={cn(
        "relative min-h-[90vh] flex flex-col items-center justify-center px-4 py-8 overflow-visible",
        className
      )}
    >
      {/* Spotlight effect */}
      <Spotlight fill="hsl(var(--primary))" className="-top-40 left-0 md:left-60 md:-top-20" />

      <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-6xl mx-auto gap-8 ">
        
        {/* Left Side: Content */}
        <div className="flex-1 text-center md:text-left z-10">
          {/* Badge */}
          <BlurFade delay={0.1}>
            <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-white/10 px-4 py-1.5 mb-8 backdrop-blur-md shadow-sm">
              <Sparkles className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-white">AI-Powered Scheme Discovery</span>
            </div>
          </BlurFade>

          {/* Main heading */}
          <BlurFade delay={0.2}>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 tracking-tight text-white leading-tight drop-shadow-2xl">
              Bharat<span className="text-orange-500">Connect</span> <br />
              <span className="text-3xl md:text-5xl font-light text-gray-200">Find </span>
               <span className="text-green-500">Government</span>
               <br />
               <span className="text-3xl md:text-5xl font-light text-gray-200">Schemes for you</span>
            </h1>
          </BlurFade>

          {/* Subheading */}
          <BlurFade delay={0.3}>
            <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto md:mx-0 mb-8 font-light drop-shadow-md">
              Your voice-first AI assistant that helps you discover and apply for government welfare schemes in your local language.
            </p>
          </BlurFade>

          {/* CTA Buttons */}
          <BlurFade delay={0.5}>
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
              <ShimmerButton
                onClick={onStartVoice}
                className="w-full sm:w-auto min-w-[200px] h-14 text-base shadow-lg shadow-orange-500/20 z-20 relative"
                background="hsl(var(--primary))"
              >
                <Mic className="h-5 w-5 mr-2" />
                Start with Voice
              </ShimmerButton>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onStartChat}
                className="w-full sm:w-auto min-w-[180px] h-14 rounded-full border border-white/20 bg-white/10 px-6 text-base font-medium text-white transition-all hover:bg-white/20 hover:border-white/40 flex items-center justify-center gap-2 backdrop-blur-md z-20 relative"
              >
                <MessageSquare className="h-5 w-5" />
                Chat Instead
              </motion.button>
            </div>
          </BlurFade>
        </div>

        {/* Right Side: 3D Card Visual */}
        <div className="flex-1 w-full max-w-md hidden md:block">
           <BlurFade delay={0.6}>
            <CardContainer className="inter-var">
              <CardBody className="bg-gradient-to-br from-gray-900 to-black relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-white/[0.1] w-auto sm:w-[30rem] h-auto rounded-xl p-6 border  ">
                <CardItem
                  translateZ="50"
                  className="text-xl font-bold text-neutral-600 dark:text-white"
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="text-white">PM Kisan Samman Nidhi</span>
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">Active</span>
                  </div>
                </CardItem>
                <CardItem
                  as="p"
                  translateZ="60"
                  className="text-neutral-400 text-sm max-w-sm mt-2 dark:text-neutral-300"
                >
                  Financial benefit of Rs 6000/- per year to eligible farmer families.
                </CardItem>
                <CardItem translateZ="100" className="w-full mt-4">
                  <div className="h-40 w-full bg-gradient-to-br from-orange-500/20 to-green-500/20 rounded-lg flex items-center justify-center border border-white/10">
                     <span className="text-4xl">🇮🇳</span>
                  </div>
                </CardItem>
                <div className="flex justify-between items-center mt-8">
                  <CardItem
                    translateZ={20}
                    as="button"
                    className="px-4 py-2 rounded-xl text-xs font-normal text-white"
                  >
                    View Details →
                  </CardItem>
                  <CardItem
                    translateZ={20}
                    as="button"
                    className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold"
                  >
                    Check Eligibility
                  </CardItem>
                </div>
              </CardBody>
            </CardContainer>
          </BlurFade>
        </div>

      </div>
    </div>
  );
};
