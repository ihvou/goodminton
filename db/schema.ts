import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  date,
  integer,
  text,
  timestamp,
  index,
  uniqueIndex,
  check,
  boolean,
} from 'drizzle-orm/pg-core';

export const clubs = pgTable('clubs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  icon: text('icon').notNull().default('trophy'),
  accessCode: text('access_code').notNull().unique(),
  isDemo: boolean('is_demo').notNull().default(false),
  demoResetDate: date('demo_reset_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const clubAdmins = pgTable(
  'club_admins',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clubId: uuid('club_id')
      .notNull()
      .references(() => clubs.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    phone: text('phone').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('club_admins_club_idx').on(t.clubId)],
);

export const members = pgTable(
  'members',
  {
    id: text('id').primaryKey(),
    clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    avatar: text('avatar'),
    isActive: boolean('is_active').notNull().default(true),
    isPlaying: boolean('is_playing').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('members_club_idx').on(t.clubId)],
);

export const playSessions = pgTable(
  'play_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'cascade' }),
    playDate: date('play_date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('play_sessions_club_idx').on(t.clubId),
    uniqueIndex('play_sessions_club_date_unique').on(t.clubId, t.playDate),
  ],
);

export const dayTeams = pgTable(
  'day_teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => playSessions.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    playerA: text('player_a'),
    playerB: text('player_b'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('day_teams_session_idx').on(t.sessionId),
    check(
      'day_teams_distinct_players',
      sql`${t.playerA} IS NULL OR ${t.playerB} IS NULL OR ${t.playerA} <> ${t.playerB}`,
    ),
  ],
);

export const matches = pgTable(
  'matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => playSessions.id, { onDelete: 'cascade' }),
    teamAP1: text('team_a_p1').notNull(),
    teamAP2: text('team_a_p2').notNull(),
    teamBP1: text('team_b_p1').notNull(),
    teamBP2: text('team_b_p2').notNull(),
    scoreA: integer('score_a'),
    scoreB: integer('score_b'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('matches_session_idx').on(t.sessionId),
    check('matches_no_tie', sql`${t.scoreA} <> ${t.scoreB}`),
    check('matches_nonneg_score_a', sql`${t.scoreA} >= 0`),
    check('matches_nonneg_score_b', sql`${t.scoreB} >= 0`),
    check(
      'matches_distinct_players',
      sql`${t.teamAP1} <> ${t.teamAP2}
        AND ${t.teamAP1} <> ${t.teamBP1}
        AND ${t.teamAP1} <> ${t.teamBP2}
        AND ${t.teamAP2} <> ${t.teamBP1}
        AND ${t.teamAP2} <> ${t.teamBP2}
        AND ${t.teamBP1} <> ${t.teamBP2}`,
    ),
  ],
);

export type PlaySession = typeof playSessions.$inferSelect;
export type Club = typeof clubs.$inferSelect;
export type NewClub = typeof clubs.$inferInsert;
export type ClubAdmin = typeof clubAdmins.$inferSelect;
export type NewClubAdmin = typeof clubAdmins.$inferInsert;
export type DayTeam = typeof dayTeams.$inferSelect;
export type NewDayTeam = typeof dayTeams.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
