"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SpotlightCard } from "@/components/ui/spotlight";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IndianRupee,
  Calendar,
  MapPin,
  FileText,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";

export const SchemeCard = ({
  scheme,
  onSendSMS,
  className,
  eligibilityReason,
}) => {
  const {
    name,
    benefits,
    income_max,
    age_min,
    age_max,
    state,
    category,
    documents,
    apply_link,
  } = scheme;

  const formatIncome = (amount) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  return (
    <SpotlightCard
      className={cn("transition-all duration-300 hover:shadow-xl", className)}
      spotlightColor="hsl(var(--primary))"
    >
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] leading-tight">
            {name}
          </h3>
          <Badge variant="success" className="shrink-0">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Eligible
          </Badge>
        </div>

        {/* Category & State badges */}
        <div className="mt-2 flex flex-wrap gap-2">
          {category && category !== "ALL" && (
            <Badge variant="outline" className="text-xs">
              {category}
            </Badge>
          )}
          {state && state !== "ALL" && (
            <Badge variant="outline" className="text-xs">
              <MapPin className="mr-1 h-3 w-3" />
              {state}
            </Badge>
          )}
        </div>
      </div>

      {/* Benefits */}
      <div className="mb-4">
        <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
          {benefits}
        </p>
      </div>

      {/* Eligibility criteria */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-sm">
          <IndianRupee className="h-4 w-4 text-[hsl(var(--primary))]" />
          <span className="text-[hsl(var(--muted-foreground))]">
            Income: Up to {formatIncome(income_max)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-[hsl(var(--primary))]" />
          <span className="text-[hsl(var(--muted-foreground))]">
            Age: {age_min}-{age_max} years
          </span>
        </div>
      </div>

      {/* Eligibility reason */}
      {eligibilityReason && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3 border border-emerald-200 dark:border-emerald-800"
        >
          <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
            ✓ {eligibilityReason}
          </p>
        </motion.div>
      )}

      {/* Documents required */}
      {documents && documents.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <FileText className="h-4 w-4 text-[hsl(var(--primary))]" />
            <span>Required Documents</span>
          </div>
          <ul className="text-xs text-[hsl(var(--muted-foreground))] space-y-1">
            {documents.slice(0, 3).map((doc, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-[hsl(var(--muted-foreground))]" />
                {doc}
              </li>
            ))}
            {documents.length > 3 && (
              <li className="text-[hsl(var(--primary))]">
                +{documents.length - 3} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-[hsl(var(--border))]">
        <Button
          onClick={() => onSendSMS?.(scheme)}
          variant="default"
          className="flex-1"
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Send SMS
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => window.open(apply_link, "_blank")}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Apply Now
        </Button>
      </div>
    </SpotlightCard>
  );
};

export const SchemeList = ({ schemes, onSendSMS, className }) => {
  if (!schemes || schemes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[hsl(var(--muted-foreground))]">
          No eligible schemes found. Try adjusting your profile information.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>
      {schemes.map((scheme, index) => (
        <motion.div
          key={scheme.id || index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <SchemeCard scheme={scheme} onSendSMS={onSendSMS} />
        </motion.div>
      ))}
    </div>
  );
};

export default SchemeCard;
