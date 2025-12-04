/**
 * Unified App Component
 * Shows public gallery - no authentication needed for viewing
 */

import { GalleryViewer } from "./GalleryViewer";

export function UnifiedApp() {
  // Simply render the gallery viewer - no auth needed
  return <GalleryViewer />;
}
