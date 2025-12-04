/**
 * Migration Script: Add role column to users table
 *
 * This script adds the 'role' column to the existing users table.
 * - Existing users will be set to 'regular' by default
 * - The first user (by created_at) will be promoted to 'admin'
 *
 * Run with: npx tsx scripts/migrate-add-role.ts
 */

import Database from "better-sqlite3";

const DB_PATH = process.env.DB_PATH || "./data/spotify-cache.db";

function migrate() {
  console.log(`📦 Opening database at: ${DB_PATH}`);
  const db = new Database(DB_PATH);

  // Enable foreign keys
  db.pragma("foreign_keys = ON");

  try {
    // Check if role column already exists
    const tableInfo = db.prepare("PRAGMA table_info(users)").all() as Array<{
      name: string;
    }>;
    const hasRoleColumn = tableInfo.some((col) => col.name === "role");

    if (hasRoleColumn) {
      console.log("✅ Role column already exists, skipping migration");

      // Check if there's an admin
      const admin = db
        .prepare("SELECT spotify_user_id, display_name FROM users WHERE role = 'admin'")
        .get() as { spotify_user_id: string; display_name: string } | undefined;

      if (admin) {
        console.log(`👑 Current admin: ${admin.display_name || admin.spotify_user_id}`);
      } else {
        console.log("⚠️  No admin user found. Run this script with --promote-first to promote the first user.");
      }

      db.close();
      return;
    }

    console.log("🔄 Adding role column to users table...");

    // Add the role column with default value 'regular'
    db.exec(`
      ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'regular' 
      CHECK(role IN ('admin', 'regular'))
    `);

    console.log("✅ Role column added successfully");

    // Get the first user (oldest by created_at)
    const firstUser = db
      .prepare("SELECT spotify_user_id, display_name FROM users ORDER BY created_at ASC LIMIT 1")
      .get() as { spotify_user_id: string; display_name: string } | undefined;

    if (firstUser) {
      // Promote first user to admin
      db.prepare("UPDATE users SET role = 'admin' WHERE spotify_user_id = ?").run(
        firstUser.spotify_user_id
      );
      console.log(
        `👑 Promoted first user to admin: ${firstUser.display_name || firstUser.spotify_user_id}`
      );
    } else {
      console.log("ℹ️  No users found in database. First user to log in will become admin.");
    }

    // Update schema version
    db.prepare("INSERT OR REPLACE INTO schema_version (version) VALUES (?)").run(4);
    console.log("📝 Updated schema version to 4");

    // Show summary
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as {
      count: number;
    };
    const adminCount = db
      .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
      .get() as { count: number };
    const regularCount = db
      .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'regular'")
      .get() as { count: number };

    console.log("\n📊 Summary:");
    console.log(`   Total users: ${userCount.count}`);
    console.log(`   Admins: ${adminCount.count}`);
    console.log(`   Regular users: ${regularCount.count}`);

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run migration
migrate();

