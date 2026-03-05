import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";

const arcjetkey = process.env.ARCJET_KEY;
const arcjetMode = process.env.ARCJET_MODE === 'DRY_RUN' ? 'DRY_RUN' : 'LIVE' ;

if(!arcjetkey) {
    console.warn('ARCJET_KEY missing: Arcjet protection disabled.');
}

export const httpArcjet = arcjetkey ?
    arcjet({
        key: arcjetkey,
        rules: [
            shield({ mode: arcjetMode }),
            detectBot({ mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW']}),
            slidingWindow({ mode: arcjetMode, interval: '10s', max: 50 })
        ],
    }) : null;

export const wsArcjet = arcjetkey ?
    arcjet({
        key: arcjetkey,
        rules: [
            shield({ mode: arcjetMode }),
            detectBot({ mode: arcjetMode, allow: ['CATEGORY:SEARCH_ENGINE', 'CATEGORY:PREVIEW']}),
            slidingWindow({ mode: arcjetMode, interval: '2s', max: 5 })
        ],
    }) : null;

export function securityMiddleware() {
    return async (req, res, next) => {
        if (!httpArcjet) return next();

        try {
            const decision = await httpArcjet.protect(req);

            if (decision.isDenied()) {
                if (decision.reason.isRateLimit()) {
                return res.status(429).json({ error: 'Too many requests.' });
                }

                return res.status(403).json({ error: 'Forbidden.' });
            }
        } catch (err) {
            console.error('Arcjet middleware error', err);
            return res.status(503).json({ error: 'Server Unavailable' });
        }

        next();
    }
}