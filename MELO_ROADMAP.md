# 🎵 MELO - Music Gallery & Taste Analyzer

## Vision

**MELO** is a music gallery and taste analyzer that showcases the admin's music collection. Visitors can explore, discover, and understand the musical preferences through beautiful visualizations and insightful statistics.

**Tagline**: _"Discover the soundtrack of someone's life"_

---

## 🎨 Design System

### Brand Identity

- **Name**: MELO
- **Logo Font**: Press Start 2P (pixelated, retro-gaming aesthetic)
- **Body Font**: Inter (clean, modern readability)
- **Theme**: Dark mode with customizable accent color
- **Default Accent**: Orange (#f97316)

### Color Palette

```css
/* Base Colors */
--background: #0f0f0f;
--background-secondary: #1a1a1a;
--background-tertiary: #262626;
--border: #333333;
--text-primary: #ffffff;
--text-secondary: #a3a3a3;
--text-muted: #737373;

/* Accent (customizable by admin) */
--accent: #f97316;
--accent-hover: #ea580c;
--accent-muted: rgba(249, 115, 22, 0.1);
```

### Typography

```css
/* Headings */
font-family: "Inter", sans-serif;
font-weight: 600;

/* Body */
font-family: "Inter", sans-serif;
font-weight: 400;

/* Logo */
font-family: "Press Start 2P", cursive;
```

---

## 📐 Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         HEADER                                   │
│  [MELO Logo]        [🔍 Search...]              [Admin Avatar]  │
├──────────────┬─────────────────────────────┬────────────────────┤
│              │                             │                    │
│   SIDEBAR    │          MAIN               │    SIDEBAR         │
│    LEFT      │        CONTENT              │     RIGHT          │
│              │                             │                    │
│  Navigation  │      Track List             │    Statistics      │
│  Categories  │      Grid/Table             │    Widgets         │
│  Filters     │                             │    Insights        │
│              │                             │                    │
├──────────────┴─────────────────────────────┴────────────────────┤
│                         FOOTER                                   │
│  [Track Info]  [◀ ▶ ⏸]  [Progress Bar]  [Export] [Open Spotify] │
└─────────────────────────────────────────────────────────────────┘
```

### Dimensions

- **Header**: 64px height
- **Footer**: 80px height
- **Left Sidebar**: 240px width (collapsible)
- **Right Sidebar**: 320px width (collapsible)
- **Main Content**: Fluid (remaining space)

---

## 🚀 Implementation Phases

### Phase 1: Foundation & Layout (Priority: HIGH)

**Goal**: Establish the base structure and design system

#### 1.1 Setup Design System

- [ ] Add Google Fonts (Press Start 2P, Inter)
- [ ] Create CSS variables for theme colors in `global.css`
- [ ] Create accent color CSS variable (customizable)
- [ ] Update Tailwind config with custom colors

#### 1.2 Create Layout Components

- [ ] `MeloLayout.tsx` - Main layout wrapper
- [ ] `Header.tsx` - Top navigation bar
- [ ] `LeftSidebar.tsx` - Navigation sidebar
- [ ] `RightSidebar.tsx` - Statistics sidebar
- [ ] `Footer.tsx` - Player controls
- [ ] `MainContent.tsx` - Track list area

#### 1.3 Create Base UI Components

- [ ] `Accordion.tsx` - For category expansion (use shadcn)
- [ ] `Avatar.tsx` - For admin profile (use shadcn)
- [ ] `SearchInput.tsx` - Search with icon
- [ ] `Badge.tsx` - For counts and labels

**Estimated Time**: 4-6 hours

---

### Phase 2: Header (Priority: HIGH)

**Goal**: Create the top navigation with logo, search, and admin info

#### 2.1 Logo Component

- [ ] `MeloLogo.tsx` - Pixelated "MELO" text
- [ ] Optional: Add subtle animation on hover

#### 2.2 Search Component

- [ ] `GlobalSearch.tsx` - Search input with icon
- [ ] Search functionality (filter tracks by name/artist)
- [ ] Search results dropdown (optional)
- [ ] Keyboard shortcut (Cmd/Ctrl + K)

#### 2.3 Admin Avatar & Popup

- [ ] `AdminAvatar.tsx` - Clickable avatar
- [ ] `AdminPopup.tsx` - Popup with admin info
- [ ] Display customizable text from admin settings
- [ ] Social links (optional)

**Estimated Time**: 2-3 hours

---

### Phase 3: Left Sidebar - Navigation (Priority: HIGH)

**Goal**: Category-based navigation for filtering tracks

#### 3.1 Navigation Structure

```
📊 All Tracks          ← Default view
📁 Playlists          ← Accordion (future)
🎭 Genres             ← Accordion
🎵 Moods              ← Accordion
📅 Decades            ← Accordion
⭐ Popularity         ← Accordion
⏱️ Duration           ← Accordion
📆 Recently Added     ← Accordion
```

#### 3.2 Components

- [ ] `NavItem.tsx` - Single navigation item
- [ ] `NavAccordion.tsx` - Expandable category
- [ ] `NavBadge.tsx` - Track count badge
- [ ] `LeftSidebar.tsx` - Container component

#### 3.3 Functionality

- [ ] Click to filter main content
- [ ] Show track count per category
- [ ] Active state indication
- [ ] Smooth expand/collapse animation

**Estimated Time**: 3-4 hours

---

### Phase 4: Main Content - Track List (Priority: HIGH)

**Goal**: Display tracks in a beautiful, interactive list

#### 4.1 Track List Component

- [ ] `TrackList.tsx` - Main container
- [ ] `TrackRow.tsx` - Individual track row
- [ ] `TrackGrid.tsx` - Alternative grid view (optional)

#### 4.2 Track Row Design

```
┌─────────────────────────────────────────────────────────────┐
│ [#] [🖼️] [Track Name        ] [Artist    ] [Album   ] [⏱️] │
│  1   Art  "Between Death..."   Brand of..   Album      4:12 │
└─────────────────────────────────────────────────────────────┘
```

#### 4.3 Functionality

- [ ] Click row to play preview
- [ ] Double-click to open in Spotify
- [ ] Checkbox for selection
- [ ] Hover state with play button
- [ ] Sort by columns (name, artist, duration, etc.)
- [ ] Infinite scroll or pagination
- [ ] Selected tracks counter

#### 4.4 Visual Features

- [ ] Album art thumbnails
- [ ] Explicit badge
- [ ] Audio feature mini-bars (energy, danceability)
- [ ] Currently playing indicator

**Estimated Time**: 5-6 hours

---

### Phase 5: Right Sidebar - Statistics (Priority: MEDIUM)

**Goal**: Show insightful statistics about the current track list

#### 5.1 Statistics Widgets

**Basic Stats Card**

```
┌─────────────────┐
│ 📊 STATISTICS   │
├─────────────────┤
│ Tracks    2,874 │
│ Artists     847 │
│ Albums      612 │
│ Duration  168h  │
└─────────────────┘
```

**Top Genres Widget**

```
┌─────────────────┐
│ 🎭 TOP GENRES   │
├─────────────────┤
│ ● Rock      423 │
│ ● Pop       312 │
│ ● Metal     287 │
│ ● Indie     156 │
│ ● Electronic 98 │
└─────────────────┘
```

**Decade Distribution**

```
┌─────────────────┐
│ 📅 DECADES      │
├─────────────────┤
│ 2020s ████████░ │
│ 2010s ██████░░░ │
│ 2000s ████░░░░░ │
│ 1990s ██░░░░░░░ │
└─────────────────┘
```

**Top Artists**

```
┌─────────────────┐
│ 🎤 TOP ARTISTS  │
├─────────────────┤
│ 1. Artist Name  │
│    45 tracks    │
│ 2. Artist Name  │
│    38 tracks    │
└─────────────────┘
```

#### 5.2 Components

- [ ] `StatsCard.tsx` - Basic statistics
- [ ] `GenresWidget.tsx` - Genre distribution
- [ ] `DecadesWidget.tsx` - Decade chart
- [ ] `TopArtistsWidget.tsx` - Top artists list
- [ ] `TopAlbumsWidget.tsx` - Top albums list
- [ ] `MoodWidget.tsx` - Mood analysis
- [ ] `AudioProfileWidget.tsx` - Audio features summary

#### 5.3 Advanced Insights

- [ ] **Listening Personality** - Based on audio features
  - "Energetic Explorer" (high energy, diverse genres)
  - "Chill Curator" (low energy, high acousticness)
  - "Dance Floor DJ" (high danceability)
  - "Melancholic Poet" (low valence, high acousticness)
- [ ] **Discovery Score** - Mix of popular vs obscure
- [ ] **Explicit Ratio** - Family-friendly indicator
- [ ] **Live Music Affinity** - Based on liveness
- [ ] **Acoustic vs Electronic** - Ratio visualization

**Estimated Time**: 4-5 hours

---

### Phase 6: Footer - Player Controls (Priority: HIGH)

**Goal**: Audio preview player with controls and export functionality

#### 6.1 Player Design

```
┌─────────────────────────────────────────────────────────────────┐
│ [🖼️] Track Name - Artist  [◀][⏸][▶]  ━━━●━━━━  1:23/3:47  🔊━━ │
│                           [🔀][📤][🔗]                          │
└─────────────────────────────────────────────────────────────────┘
```

#### 6.2 Components

- [ ] `Player.tsx` - Main player container
- [ ] `PlayerControls.tsx` - Play/pause/prev/next
- [ ] `ProgressBar.tsx` - Seek bar with time
- [ ] `VolumeControl.tsx` - Volume slider
- [ ] `TrackInfo.tsx` - Current track display
- [ ] `PlayerActions.tsx` - Export, shuffle, Spotify link

#### 6.3 Functionality

- [ ] Play/pause preview audio
- [ ] Previous/next track in list
- [ ] Progress bar with seek
- [ ] Volume control
- [ ] Shuffle mode
- [ ] Export selected tracks (JSON/CSV)
- [ ] Open current track in Spotify
- [ ] Keyboard shortcuts (space, arrows)

**Estimated Time**: 4-5 hours

---

### Phase 7: Admin Settings (Priority: LOW)

**Goal**: Allow admin to customize the gallery

#### 7.1 Settings Page (`/admin/settings`)

- [ ] Accent color picker
- [ ] Admin bio/description text
- [ ] Social links
- [ ] Gallery name customization
- [ ] Welcome message

#### 7.2 Database Changes

- [ ] Create `settings` table or add to `users` table
- [ ] Store: accent_color, bio, social_links, gallery_name

#### 7.3 Components

- [ ] `ColorPicker.tsx` - Accent color selection
- [ ] `TextEditor.tsx` - Bio editor
- [ ] `SettingsForm.tsx` - Settings form

**Estimated Time**: 3-4 hours

---

### Phase 8: Polish & Enhancements (Priority: LOW)

#### 8.1 Animations

- [ ] Page transitions
- [ ] List item animations (stagger)
- [ ] Hover effects
- [ ] Loading skeletons

#### 8.2 Responsive Design

- [ ] Tablet layout (collapse sidebars)
- [ ] Mobile layout (bottom navigation)

#### 8.3 Accessibility

- [ ] Keyboard navigation
- [ ] Screen reader labels
- [ ] Focus indicators
- [ ] Color contrast

#### 8.4 Performance

- [ ] Virtual scrolling for large lists
- [ ] Image lazy loading
- [ ] Memoization

**Estimated Time**: 4-6 hours

---

## 📊 Feature Priority Matrix

| Feature             | Impact | Effort | Priority |
| ------------------- | ------ | ------ | -------- |
| Layout Structure    | High   | Medium | 🔴 P1    |
| Track List          | High   | Medium | 🔴 P1    |
| Player Controls     | High   | Medium | 🔴 P1    |
| Left Sidebar Nav    | High   | Low    | 🔴 P1    |
| Header              | Medium | Low    | 🟡 P2    |
| Right Sidebar Stats | Medium | Medium | 🟡 P2    |
| Search              | Medium | Low    | 🟡 P2    |
| Admin Settings      | Low    | Medium | 🟢 P3    |
| Playlist Support    | Medium | High   | 🟢 P3    |
| Responsive Design   | Low    | High   | 🟢 P3    |

---

## 🗂️ File Structure

```
src/
├── components/
│   ├── melo/
│   │   ├── MeloLayout.tsx
│   │   ├── Header.tsx
│   │   ├── LeftSidebar.tsx
│   │   ├── RightSidebar.tsx
│   │   ├── Footer.tsx
│   │   ├── MainContent.tsx
│   │   ├── MeloLogo.tsx
│   │   ├── GlobalSearch.tsx
│   │   ├── AdminAvatar.tsx
│   │   ├── NavItem.tsx
│   │   ├── NavAccordion.tsx
│   │   ├── TrackList.tsx
│   │   ├── TrackRow.tsx
│   │   ├── Player.tsx
│   │   ├── PlayerControls.tsx
│   │   └── widgets/
│   │       ├── StatsCard.tsx
│   │       ├── GenresWidget.tsx
│   │       ├── DecadesWidget.tsx
│   │       ├── TopArtistsWidget.tsx
│   │       └── MoodWidget.tsx
│   └── ui/
│       └── ... (shadcn components)
├── hooks/
│   ├── usePlayer.ts
│   ├── useTrackSelection.ts
│   └── useGalleryStats.ts
├── stores/
│   ├── usePlayerStore.ts
│   └── useFilterStore.ts
└── styles/
    └── global.css
```

---

## 🎯 Success Criteria

### MVP (Minimum Viable Product)

- [ ] Three-column layout working
- [ ] Track list displays all tracks
- [ ] Can filter by category (genre, decade, etc.)
- [ ] Preview player works
- [ ] Basic statistics visible

### Full Release

- [ ] All widgets implemented
- [ ] Search functionality
- [ ] Export tracks feature
- [ ] Admin customization
- [ ] Smooth animations
- [ ] Responsive design

---

## 🚦 Implementation Order

1. **Week 1**: Phases 1-3 (Foundation, Header, Left Sidebar)
2. **Week 2**: Phases 4-5 (Track List, Statistics)
3. **Week 3**: Phase 6 (Player)
4. **Week 4**: Phases 7-8 (Admin Settings, Polish)

---

## 📝 Notes

- Focus on desktop-first design
- Use existing data from the gallery API
- Postpone playlist functionality
- Keep the design minimalist and clean
- Ensure smooth 60fps animations
- Test with the full 2,874 track dataset

---

## 🔗 Resources

- [Press Start 2P Font](https://fonts.google.com/specimen/Press+Start+2P)
- [Inter Font](https://fonts.google.com/specimen/Inter)
- [Lucide Icons](https://lucide.dev/icons)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS v4](https://tailwindcss.com/)

---

**Last Updated**: December 6, 2025
**Status**: Planning Complete ✅
