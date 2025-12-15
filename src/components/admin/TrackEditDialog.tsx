/**
 * Track Edit/Create Dialog Component
 * Form for editing existing tracks or adding new ones
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, Music, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MUSICAL_KEYS } from "@/lib/music-utils";
import type { Track } from "@/types/spotify";

// ============================================================================
// Types
// ============================================================================

interface TrackEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track?: Track | null;
  onSave: (trackData: TrackFormData) => Promise<void>;
  onFetchFromSpotify?: (spotifyIdOrUrl: string) => Promise<Partial<TrackFormData> | null>;
}

export interface TrackFormData {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    release_date: string;
    images?: { url: string }[];
  };
  duration_ms: number;
  popularity: number;
  explicit: boolean;
  isrc: string;
  preview_url: string | null;
  // Audio features
  tempo: number;
  energy: number;
  danceability: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  speechiness: number;
  loudness: number;
  key: number;
  mode: number;
  time_signature: number;
  // Genres (comma-separated string for input)
  genres: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_FORM_DATA: TrackFormData = {
  id: "",
  name: "",
  artists: [{ id: "", name: "" }],
  album: { id: "", name: "", release_date: "" },
  duration_ms: 0,
  popularity: 50,
  explicit: false,
  isrc: "",
  preview_url: null,
  tempo: 120,
  energy: 0.5,
  danceability: 0.5,
  valence: 0.5,
  acousticness: 0.5,
  instrumentalness: 0,
  liveness: 0.2,
  speechiness: 0.1,
  loudness: -10,
  key: 0,
  mode: 1,
  time_signature: 4,
  genres: "",
};

// ============================================================================
// Helper Functions
// ============================================================================

function trackToFormData(track: Track): TrackFormData {
  const { details, feats } = track;
  return {
    id: track.id,
    name: details.name || "",
    artists: details.artists || [{ id: "", name: "" }],
    album: {
      id: details.album?.id || "",
      name: details.album?.name || "",
      release_date: details.album?.release_date || "",
      images: details.album?.images,
    },
    duration_ms: details.duration_ms || 0,
    popularity: details.popularity || 50,
    explicit: details.explicit || false,
    isrc: details.external_ids?.isrc || "",
    preview_url: details.preview_url,
    tempo: feats?.tempo || 120,
    energy: feats?.energy || 0.5,
    danceability: feats?.danceability || 0.5,
    valence: feats?.valence || 0.5,
    acousticness: feats?.acousticness || 0.5,
    instrumentalness: feats?.instrumentalness || 0,
    liveness: feats?.liveness || 0.2,
    speechiness: feats?.speechiness || 0.1,
    loudness: feats?.loudness || -10,
    key: feats?.key ?? 0,
    mode: feats?.mode ?? 1,
    time_signature: feats?.time_signature || 4,
    genres: feats?.genres ? Array.from(feats.genres).join(", ") : "",
  };
}

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function parseDuration(str: string): number {
  const parts = str.split(":");
  if (parts.length === 2) {
    const mins = parseInt(parts[0]) || 0;
    const secs = parseInt(parts[1]) || 0;
    return mins * 60000 + secs * 1000;
  }
  return parseInt(str) || 0;
}

// ============================================================================
// Sub-components
// ============================================================================

interface FeatureSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
}

function FeatureSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  format = (v) => `${Math.round(v * 100)}%`,
}: FeatureSliderProps) {
  const [inputValue, setInputValue] = useState(format(value));

  useEffect(() => {
    setInputValue(format(value));
  }, [value, format]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);
  };

  const handleInputBlur = () => {
    // Parse the input value and update
    let parsed: number;
    if (max === 1 && inputValue.endsWith("%")) {
      parsed = parseFloat(inputValue) / 100;
    } else {
      parsed = parseFloat(inputValue);
    }
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
    } else {
      setInputValue(format(value));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          className="w-20 h-6 text-xs text-right px-2"
        />
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TrackEditDialog({
  open,
  onOpenChange,
  track,
  onSave,
  onFetchFromSpotify,
}: TrackEditDialogProps) {
  const isEditing = !!track;
  const [formData, setFormData] = useState<TrackFormData>(DEFAULT_FORM_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchInput, setFetchInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens/closes or track changes
  useEffect(() => {
    if (open) {
      if (track) {
        setFormData(trackToFormData(track));
      } else {
        setFormData(DEFAULT_FORM_DATA);
      }
      setError(null);
      setFetchInput("");
    }
  }, [open, track]);

  const updateField = useCallback(
    <K extends keyof TrackFormData>(key: K, value: TrackFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleFetchFromSpotify = async () => {
    if (!onFetchFromSpotify || !fetchInput.trim()) return;

    setIsFetching(true);
    setError(null);
    try {
      // Extract ID from URL if needed
      let spotifyId = fetchInput.trim();
      const urlMatch = spotifyId.match(/track\/([a-zA-Z0-9]+)/);
      if (urlMatch) {
        spotifyId = urlMatch[1];
      }

      const data = await onFetchFromSpotify(spotifyId);
      if (data) {
        setFormData((prev) => ({ ...prev, ...data }));
      } else {
        setError("Track not found or failed to fetch");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch track");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSave = async () => {
    if (!formData.id || !formData.name) {
      setError("Track ID and name are required");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save track");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            {isEditing ? "Edit Track" : "Add New Track"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update track information and audio features"
              : "Add a new track to the database"}
          </DialogDescription>
        </DialogHeader>

        {/* Fetch from Spotify (only for new tracks) */}
        {!isEditing && onFetchFromSpotify && (
          <div className="flex gap-2 p-3 bg-secondary/50 rounded-lg">
            <Input
              value={fetchInput}
              onChange={(e) => setFetchInput(e.target.value)}
              placeholder="Paste Spotify URL or track ID..."
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleFetchFromSpotify()}
            />
            <Button
              onClick={handleFetchFromSpotify}
              disabled={isFetching || !fetchInput.trim()}
            >
              {isFetching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span className="ml-2">Fetch</span>
            </Button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="features">Audio Features</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="id">Spotify ID *</Label>
                  <Input
                    id="id"
                    value={formData.id}
                    onChange={(e) => updateField("id", e.target.value)}
                    placeholder="22-character Spotify ID"
                    disabled={isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="isrc">ISRC</Label>
                  <Input
                    id="isrc"
                    value={formData.isrc}
                    onChange={(e) => updateField("isrc", e.target.value)}
                    placeholder="International Standard Recording Code"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Track Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Track name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="artists">Artists</Label>
                <Input
                  id="artists"
                  value={formData.artists.map((a) => a.name).join(", ")}
                  onChange={(e) =>
                    updateField(
                      "artists",
                      e.target.value.split(",").map((name) => ({
                        id: "",
                        name: name.trim(),
                      }))
                    )
                  }
                  placeholder="Artist names (comma-separated)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="album">Album Name</Label>
                  <Input
                    id="album"
                    value={formData.album.name}
                    onChange={(e) =>
                      updateField("album", { ...formData.album, name: e.target.value })
                    }
                    placeholder="Album name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="release_date">Release Date</Label>
                  <Input
                    id="release_date"
                    type="date"
                    value={formData.album.release_date?.substring(0, 10) || ""}
                    onChange={(e) =>
                      updateField("album", {
                        ...formData.album,
                        release_date: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Input
                    id="duration"
                    value={formatDuration(formData.duration_ms)}
                    onChange={(e) =>
                      updateField("duration_ms", parseDuration(e.target.value))
                    }
                    placeholder="3:30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="popularity">Popularity (0-100)</Label>
                  <Input
                    id="popularity"
                    type="number"
                    min={0}
                    max={100}
                    value={formData.popularity}
                    onChange={(e) =>
                      updateField("popularity", parseInt(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Explicit</Label>
                  <Select
                    value={formData.explicit ? "yes" : "no"}
                    onValueChange={(v) => updateField("explicit", v === "yes")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="genres">Genres</Label>
                <Input
                  id="genres"
                  value={formData.genres}
                  onChange={(e) => updateField("genres", e.target.value)}
                  placeholder="rock, indie, alternative (comma-separated)"
                />
              </div>
            </TabsContent>

            {/* Audio Features Tab */}
            <TabsContent value="features" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-6">
                <FeatureSlider
                  label="Energy"
                  value={formData.energy}
                  onChange={(v) => updateField("energy", v)}
                />
                <FeatureSlider
                  label="Danceability"
                  value={formData.danceability}
                  onChange={(v) => updateField("danceability", v)}
                />
                <FeatureSlider
                  label="Valence (Happiness)"
                  value={formData.valence}
                  onChange={(v) => updateField("valence", v)}
                />
                <FeatureSlider
                  label="Acousticness"
                  value={formData.acousticness}
                  onChange={(v) => updateField("acousticness", v)}
                />
                <FeatureSlider
                  label="Instrumentalness"
                  value={formData.instrumentalness}
                  onChange={(v) => updateField("instrumentalness", v)}
                />
                <FeatureSlider
                  label="Liveness"
                  value={formData.liveness}
                  onChange={(v) => updateField("liveness", v)}
                />
                <FeatureSlider
                  label="Speechiness"
                  value={formData.speechiness}
                  onChange={(v) => updateField("speechiness", v)}
                />
                <FeatureSlider
                  label="Tempo (BPM)"
                  value={formData.tempo}
                  onChange={(v) => updateField("tempo", v)}
                  min={0}
                  max={250}
                  step={1}
                  format={(v) => `${Math.round(v)}`}
                />
                <FeatureSlider
                  label="Loudness (dB)"
                  value={formData.loudness}
                  onChange={(v) => updateField("loudness", v)}
                  min={-60}
                  max={0}
                  step={0.1}
                  format={(v) => `${v.toFixed(1)}`}
                />
              </div>
            </TabsContent>

            {/* Metadata Tab */}
            <TabsContent value="metadata" className="space-y-4 mt-0">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Key</Label>
                  <Select
                    value={formData.key.toString()}
                    onValueChange={(v) => updateField("key", parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MUSICAL_KEYS.map((key, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select
                    value={formData.mode.toString()}
                    onValueChange={(v) => updateField("mode", parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Minor</SelectItem>
                      <SelectItem value="1">Major</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time Signature</Label>
                  <Select
                    value={formData.time_signature.toString()}
                    onValueChange={(v) => updateField("time_signature", parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3/4</SelectItem>
                      <SelectItem value="4">4/4</SelectItem>
                      <SelectItem value="5">5/4</SelectItem>
                      <SelectItem value="6">6/4</SelectItem>
                      <SelectItem value="7">7/4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preview_url">Preview URL</Label>
                <Input
                  id="preview_url"
                  value={formData.preview_url || ""}
                  onChange={(e) =>
                    updateField("preview_url", e.target.value || null)
                  }
                  placeholder="https://p.scdn.co/mp3-preview/..."
                />
              </div>

              {/* Album Images (read-only display) */}
              {formData.album.images && formData.album.images.length > 0 && (
                <div className="space-y-2">
                  <Label>Album Art</Label>
                  <div className="flex gap-2">
                    {formData.album.images.slice(0, 3).map((img, i) => (
                      <img
                        key={i}
                        src={img.url}
                        alt="Album art"
                        className="w-16 h-16 rounded"
                      />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? "Save Changes" : "Add Track"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

