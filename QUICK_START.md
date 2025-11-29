# 🚀 Quick Start Guide - Resume Work

**Last Updated**: November 29, 2025

## 📍 Where We Left Off

We just finished fixing critical bugs and documenting the new multi-user architecture. The app is **stable and working**, but the role-based system is **not yet implemented**.

---

## ✅ What's Working Now

- ✅ **2,872 tracks** synced with 100% SoundCharts coverage
- ✅ Admin dashboard at `/admin` (no role verification yet)
- ✅ Spotify OAuth authentication (PKCE flow)
- ✅ Database schema v3 with `users` and `user_tracks` tables
- ✅ All critical bugs fixed (UNIQUE constraint, added_at column, token expiration)

---

## 🎯 What We're Building

### The Gallery Concept
- **Admin** (you) = Gallery owner who syncs tracks
- **Regular users** = Visitors who browse your tracks
- **Future**: Regular users can create playlists from your tracks

---

## 🔥 Next Steps (In Order)

### 1️⃣ Add Role System (30 min)
```sql
-- Add role column to users table
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'regular' 
  CHECK(role IN ('admin', 'regular'));
```

**Files to modify**:
- `src/lib/db/schema.ts` - Add role to CREATE_USERS_TABLE
- `src/lib/db/users-repository.ts` - Add role methods
- Run migration on database

### 2️⃣ Protect Admin Endpoints (20 min)
**Files to modify**:
- `src/pages/api/sync.ts` - Verify admin role
- `src/pages/api/migrate-isrc.ts` - Verify admin role
- `src/pages/api/clear-failed.ts` - Verify admin role

**Add this check**:
```typescript
// Get user from Spotify token
const user = await spotifyAPI.getCurrentUser();

// Verify user is admin
const isAdmin = repos.users.isAdmin(user.id);
if (!isAdmin) {
  return new Response(
    JSON.stringify({ error: "Admin access required" }),
    { status: 403 }
  );
}
```

### 3️⃣ Create Public Gallery Endpoint (30 min)
**New file**: `src/pages/api/gallery/tracks.ts`

```typescript
// GET /api/gallery/tracks
// Returns admin's tracks (no auth required)
export const GET: APIRoute = async ({ url }) => {
  const repos = getRepositories();
  
  // Get admin user
  const admin = repos.users.getAdmin();
  
  // Get admin's tracks
  const tracks = repos.users.getUserTracks(admin.spotify_user_id);
  
  return new Response(JSON.stringify({ tracks }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
```

### 4️⃣ Update Frontend (45 min)
**Files to modify**:
- `src/components/UnifiedApp.tsx` - Remove login requirement for browsing
- `src/hooks/useMusicLoaderV3.ts` - Use `/api/gallery/tracks`
- `src/components/MusicOrganizer.tsx` - Work without auth token

---

## 📂 Key Files to Know

### Database
- `src/lib/db/schema.ts` - Table definitions
- `src/lib/db/users-repository.ts` - User operations
- `src/lib/db/tracks-repository.ts` - Track operations
- `src/lib/db/database.ts` - Database connection

### API Endpoints
- `src/pages/api/sync.ts` - Sync admin tracks (NEEDS ROLE CHECK)
- `src/pages/api/stats.ts` - Dashboard statistics
- `src/pages/api/tracks.ts` - Get tracks (WILL BE REPLACED)
- `src/pages/api/auth/callback.ts` - OAuth callback

### Frontend
- `src/components/UnifiedApp.tsx` - Main app entry point
- `src/components/MusicOrganizer.tsx` - Music browser
- `src/components/AdminDashboard.tsx` - Admin panel
- `src/hooks/useMusicLoaderV3.ts` - Track loading logic

### Configuration
- `src/config/constants.ts` - All app constants
- `.env` - Environment variables (Spotify + SoundCharts keys)

---

## 🗄️ Database Location

```bash
data/spotify-cache.db  # Main database (14 MB)
```

**Quick commands**:
```bash
# View database info
sqlite3 data/spotify-cache.db "SELECT COUNT(*) FROM tracks;"

# Check schema version
sqlite3 data/spotify-cache.db "SELECT version FROM schema_version;"

# View users
sqlite3 data/spotify-cache.db "SELECT * FROM users;"
```

---

## 🐛 Common Issues & Solutions

### Issue: "No such column: added_at"
**Solution**: Already fixed. Column moved to `user_tracks` table.

### Issue: "UNIQUE constraint failed: tracks.soundcharts_uuid"
**Solution**: Already fixed. UNIQUE constraint removed.

### Issue: "window is not defined"
**Solution**: Already fixed. Removed client-side code from server files.

### Issue: Token expired
**Solution**: Go to `/` and login again. Token lasts 1 hour.

---

## 🧪 Testing Checklist

Before making changes, verify:
- [ ] Server is running: `pnpm dev`
- [ ] Database exists: `ls -lh data/spotify-cache.db`
- [ ] Admin dashboard loads: `http://localhost:4321/admin`
- [ ] Stats endpoint works: `curl http://localhost:4321/api/stats`

After making changes, test:
- [ ] No TypeScript errors: `pnpm build`
- [ ] Database migration ran successfully
- [ ] Admin can sync tracks
- [ ] Regular users can browse (after implementing)

---

## 💡 Quick Commands

```bash
# Start dev server
pnpm dev

# Check database stats
curl -s http://localhost:4321/api/stats | jq '.tracks'

# View failed tracks
curl -s http://localhost:4321/api/failed-tracks | jq '.tracks | length'

# Test sync (requires valid token)
curl -X POST http://localhost:4321/api/sync \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"collectionType":"saved"}'
```

---

## 📋 Implementation Order

```
Phase 1: Role System
├── 1. Add role column to users table
├── 2. Create migration script
├── 3. Add role methods to UsersRepository
└── 4. Initialize admin user

Phase 2: Admin Protection
├── 1. Add admin verification to /api/sync
├── 2. Add admin verification to /api/migrate-isrc
├── 3. Add admin verification to /api/clear-failed
└── 4. Test admin-only access

Phase 3: Public Gallery
├── 1. Create /api/gallery/tracks endpoint
├── 2. Test public access (no auth)
└── 3. Verify correct data returned

Phase 4: Frontend Updates
├── 1. Remove login requirement from UnifiedApp
├── 2. Update useMusicLoaderV3 to use gallery endpoint
├── 3. Update MusicOrganizer for public browsing
└── 4. Test complete flow
```

---

## 🎯 Success Criteria

You'll know it's working when:
1. ✅ Admin can login and sync tracks
2. ✅ Non-admin users get "Admin access required" error on sync
3. ✅ Anyone can browse tracks at `/` without login
4. ✅ Gallery shows admin's tracks with full audio features
5. ✅ No errors in console or terminal

---

## 📞 Need Help?

1. Check `PROJECT_STATUS.md` for detailed documentation
2. Check `DATABASE_ARCHITECTURE.md` for schema details
3. Check `src/config/README.md` for configuration info
4. Review recent git commits for context

---

**Ready to continue? Start with Phase 1: Add Role System** 🚀

