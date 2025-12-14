/**
 * Mood Widget
 * Shows the listening personality based on audio features
 */

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioProfile {
  avgEnergy: number;
  avgDanceability: number;
  avgValence: number;
  avgAcousticness: number;
  avgInstrumentalness: number;
}

interface MoodWidgetProps {
  audioProfile: AudioProfile;
  className?: string;
}

interface Personality {
  name: string;
  description: string;
  emoji: string;
}

function getListeningPersonality(profile: AudioProfile): Personality {
  const { avgEnergy, avgDanceability, avgValence, avgAcousticness } = profile;

  // High energy + high danceability = Party Animal
  if (avgEnergy > 0.7 && avgDanceability > 0.7) {
    return {
      name: "Dance Floor DJ",
      description: "You love high-energy tracks that get people moving!",
      emoji: "🕺",
    };
  }

  // High energy + low valence = Intense Listener
  if (avgEnergy > 0.7 && avgValence < 0.4) {
    return {
      name: "Intensity Seeker",
      description: "You gravitate towards powerful, emotionally charged music.",
      emoji: "🔥",
    };
  }

  // High valence + moderate energy = Happy Vibes
  if (avgValence > 0.6 && avgEnergy > 0.4) {
    return {
      name: "Sunshine Curator",
      description: "Your playlist radiates positivity and good vibes!",
      emoji: "☀️",
    };
  }

  // High acousticness = Acoustic Soul
  if (avgAcousticness > 0.6) {
    return {
      name: "Acoustic Soul",
      description: "You appreciate the beauty of organic, unplugged sounds.",
      emoji: "🎸",
    };
  }

  // Low energy + low valence = Melancholic
  if (avgEnergy < 0.4 && avgValence < 0.4) {
    return {
      name: "Melancholic Poet",
      description: "You find beauty in introspective, emotional music.",
      emoji: "🌙",
    };
  }

  // Low energy + high valence = Chill Vibes
  if (avgEnergy < 0.5 && avgValence > 0.5) {
    return {
      name: "Chill Curator",
      description: "You prefer relaxed, feel-good tunes for easy listening.",
      emoji: "🍃",
    };
  }

  // Default: Eclectic
  return {
    name: "Eclectic Explorer",
    description:
      "Your taste spans across genres and moods - a true music lover!",
    emoji: "🎵",
  };
}

export function MoodWidget({ audioProfile, className }: MoodWidgetProps) {
  const personality = getListeningPersonality(audioProfile);

  const features = [
    { label: "Energy", value: audioProfile.avgEnergy },
    { label: "Danceability", value: audioProfile.avgDanceability },
    { label: "Happiness", value: audioProfile.avgValence },
    { label: "Acoustic", value: audioProfile.avgAcousticness },
  ];

  return (
    <div className={cn("widget-card", className)}>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <Sparkles className="w-3 h-3" />
        Listening Personality
      </h3>

      {/* Personality Badge */}
      <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-accent-muted">
        <span className="text-2xl">{personality.emoji}</span>
        <div>
          <p className="text-sm font-semibold text-accent">
            {personality.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {personality.description}
          </p>
        </div>
      </div>

      {/* Audio Features */}
      <div className="space-y-2">
        {features.map((feature) => (
          <div key={feature.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{feature.label}</span>
              <span className="text-foreground">
                {Math.round(feature.value * 100)}%
              </span>
            </div>
            <div className="h-1 bg-background-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${feature.value * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
