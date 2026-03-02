import { MATCH_STATUS } from "../validation/matches.js";

/**
 * Determine a match's status based on its start and end times.
 * @param {Date|string|number} startTime - Value accepted by the Date constructor representing the match start.
 * @param {Date|string|number} endTime - Value accepted by the Date constructor representing the match end.
 * @param {Date} [now=new Date()] - Reference time used to evaluate the status.
 * @returns {string|null} `MATCH_STATUS.SHEDULED` if `now` is before `startTime`, `MATCH_STATUS.FINISHED` if `now` is on or after `endTime`, `MATCH_STATUS.LIVE` otherwise; returns `null` if either `startTime` or `endTime` is not a valid date.
 */
export function getMatchStatus(startTime, endTime, now = new Date()) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
    }

    if (now < start) {
        return MATCH_STATUS.SHEDULED;
    }

    if (now >= end) {
        return MATCH_STATUS.FINISHED;
    }

    return MATCH_STATUS.LIVE;
}

/**
 * Synchronizes a match object's status with the status computed from its start and end times.
 * @param {Object} match - Match object containing `startTime`, `endTime`, and `status`; `status` will be updated in place if changed.
 * @param {(newStatus: string) => Promise<void>} updateStatus - Async callback invoked with the new status when an update is required.
 * @returns {string} The match's status after synchronization; if the computed status is invalid, returns the original `match.status`.
 */
export async function syncMatchStatus(match, updateStatus) {
    const nextStatus =  getMatchStatus(match.startTime, match.endTime);

    if (!nextStatus) {
        return match.status;
    }

    if (match.status !== nextStatus) {
        await updateStatus(nextStatus);
        match.status = nextStatus;
    }
    return match.status;
}