import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  date,
  integer,
  text,
  timestamp,
  index,
  check,
  boolean,
} from 'drizzle-orm/pg-core';

export const members = pgTable('members', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  avatar: text('avatar'),
  isActive: boolean('is_active').notNull().default(true),
  isPlaying: boolean('is_playing').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const playSessions = pgTable('play_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  playDate: date('play_date').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

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
export type DayTeam = typeof dayTeams.$inferSelect;
export type NewDayTeam = typeof dayTeams.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
