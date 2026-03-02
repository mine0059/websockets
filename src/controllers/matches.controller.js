import { createMatchSchema, listMatcheQuerySchema } from "../validation/matches.js";
import { matches } from "../db/schema.js";
import { db } from "../db/db.js";
import { getMatchStatus } from "../utils/matches_status.js";
import { desc } from "drizzle-orm";

const MAX_LIMIT = 100;

const getMatches = async (req, res) => {
    const parsed = listMatcheQuerySchema.safeParse(req.query);

    if (!parsed.success) {
        return res.status(400).json({
            error: 'Invalid query',
            details: parsed.error.issues
        });
    }

    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

    try {
        const data = await db
            .select() 
            .from(matches)
            .orderBy(desc(matches.createdAt))
            .limit(limit);

        res.status(200).json({
            data
        });

    } catch (err) {
        console.error('Failed to list match', err);
        res.status(500).json({
            error: 'Failed to list match',
        });
    }
}

const createMatches = async (req, res) => {
    const parsed = createMatchSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            error: 'Invalid payload',
            details: parsed.error.issues
        });
    }

    const { sport, homeTeam, awayTeam, startTime, endTime, homeScore, awayScore } = parsed.data;

    const start = new Date(startTime);
    const end = new Date(endTime);

    try {
        const [event] = await db.insert(matches).values({
            sport,
            homeTeam,
            awayTeam,
            startTime: start,
            endTime: end,
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0,
            status: getMatchStatus(start, end),
        }).returning();

        res.status(201).json({
            data: event
        });

    } catch (err) {
        console.error('Failed to create match', err);
        res.status(500).json({
            error: 'Failed to create match',
        });
    }
}

export {
    getMatches,
    createMatches,
};


// const createMatches = async (req, res) => {
//     const parsed = createMatchSchema.safeParse(req.body);
//     const { data: { startTime, endTime, homescore, awayscore } } = parsed;

//     if (!parsed.success) {
//         return res.status(400).json({
//             error: 'Invalid payload',
//             details: JSON.stringify(parsed.error)
//         });
//     }

//     try {
//         const [event] = await db.insert(matches).values({
//             ...parsed.data,
//             startTime: new Date(startTime),
//             endTime: new Date(endTime),
//             homeScore: homescore ?? 0,
//             awayScore: awayscore ?? 0,
//             status: getMatchStatus(startTime, endTime),
//         }).returning();

//         res.status(201).json({
//             data: event
//         });

//     } catch (err) {
//         res.status(500).json({
//             error: 'Failed to create match',
//             details: JSON.stringify(err)
//         });
//     }
// };