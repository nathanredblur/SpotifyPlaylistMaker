/**
 * Welcome Dialog Component
 * Shows app introduction on first visit or after a month
 * Uses cookies to track when the dialog was last shown
 */

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Music2,
  Sparkles,
  SlidersHorizontal,
  ListMusic,
  Play,
  HelpCircle,
} from "lucide-react";

// ============================================================================
// Constants
// ============================================================================

const COOKIE_NAME = "melo_welcome_shown";
const COOKIE_EXPIRY_DAYS = 30; // Show again after 30 days

// ============================================================================
// Helper Functions
// ============================================================================

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

function setCookie(name: string, value: string, days: number): void {
  if (typeof document === "undefined") return;
  const expires = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000
  ).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

function shouldShowWelcome(): boolean {
  const lastShown = getCookie(COOKIE_NAME);
  if (!lastShown) return true;

  const lastShownDate = new Date(lastShown);
  const daysSinceShown =
    (Date.now() - lastShownDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceShown >= COOKIE_EXPIRY_DAYS;
}

// ============================================================================
// Component
// ============================================================================

interface WelcomeDialogProps {
  /** Force the dialog to open (e.g., from help button) */
  forceOpen?: boolean;
  /** Callback when dialog is closed */
  onClose?: () => void;
}

export function WelcomeDialog({ forceOpen, onClose }: WelcomeDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Check if should show on mount
  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      setStep(0);
    } else if (shouldShowWelcome()) {
      setOpen(true);
      setStep(0);
    }
  }, [forceOpen]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setCookie(COOKIE_NAME, new Date().toISOString(), COOKIE_EXPIRY_DAYS);
    onClose?.();
  }, [onClose]);

  const handleNext = useCallback(() => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  }, [step, handleClose]);

  const handlePrevious = useCallback(() => {
    if (step > 0) {
      setStep(step - 1);
    }
  }, [step]);

  const steps = [
    {
      icon: Music2,
      title: "Welcome to MELO",
      description:
        "Your personal music gallery powered by Spotify. Explore, organize, and discover your music collection in new ways.",
    },
    {
      icon: SlidersHorizontal,
      title: "Filter & Sort",
      description:
        "Use the sidebar to filter tracks by genre, mood, decade, or popularity. Sort by tempo, energy, danceability, and more audio features.",
    },
    {
      icon: ListMusic,
      title: "Select & Export",
      description:
        "Click the checkbox to select tracks. Use 'Select All' to quickly select the entire filtered list. Export your selection as JSON for backup or analysis.",
    },
    {
      icon: Play,
      title: "Premium Playback",
      description:
        "With Spotify Premium, play full tracks directly in the app. Non-premium users can preview 30-second clips. Click a track or use the footer controls.",
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10">
            <Icon className="w-8 h-8 text-accent" />
          </div>
          <DialogTitle className="text-center text-xl">
            {currentStep.title}
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            {currentStep.description}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicators */}
        <div className="flex justify-center gap-2 my-4">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? "bg-accent" : "bg-muted-foreground/30"
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-2 justify-between">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={step === 0}
            className="flex-1"
          >
            Previous
          </Button>
          <Button
            onClick={handleNext}
            className="flex-1 bg-accent hover:bg-accent/90"
          >
            {step === steps.length - 1 ? "Get Started" : "Next"}
          </Button>
        </div>

        {/* Skip Button */}
        <button
          onClick={handleClose}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
        >
          Skip intro
        </button>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Help Button Component
// ============================================================================

interface HelpButtonProps {
  onClick: () => void;
  className?: string;
}

export function HelpButton({ onClick, className }: HelpButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors ${className}`}
      title="Show help"
      aria-label="Show help"
    >
      <HelpCircle className="w-5 h-5" />
    </button>
  );
}
