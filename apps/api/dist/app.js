"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_js_1 = require("./config/env.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const authRoutes_js_1 = __importDefault(require("./routes/authRoutes.js"));
const roleProtectedRoutes_js_1 = __importDefault(require("./routes/roleProtectedRoutes.js"));
const leaderboardRoutes_js_1 = __importDefault(require("./routes/leaderboardRoutes.js"));
const artistRoutes_js_1 = __importDefault(require("./routes/artistRoutes.js"));
const pointsRoutes_js_1 = __importDefault(require("./routes/pointsRoutes.js"));
const appealRoutes_js_1 = __importDefault(require("./routes/appealRoutes.js"));
const challengeRoutes_js_1 = __importDefault(require("./routes/challengeRoutes.js"));
const submissionRoutes_js_1 = __importDefault(require("./routes/submissionRoutes.js"));
const evaluationRoutes_js_1 = __importDefault(require("./routes/evaluationRoutes.js"));
const notificationRoutes_js_1 = __importDefault(require("./routes/notificationRoutes.js"));
const directorTalentRoutes_js_1 = __importDefault(require("./routes/directorTalentRoutes.js"));
const adminUserRoutes_js_1 = __importDefault(require("./routes/adminUserRoutes.js"));
const shared_1 = require("@pdi/shared");
function createApp() {
    const app = (0, express_1.default)();
    // Trust proxy headers (e.g. Railway, Cloudflare, Nginx reverse proxies)
    app.set('trust proxy', 1);
    // Security middlewares
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false, // configure specifically when serving static in prod
    }));
    // CORS configuration
    const corsMiddleware = (0, cors_1.default)({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (origin.includes('railway.app') ||
                origin.includes('localhost') ||
                origin.includes('127.0.0.1') ||
                origin.startsWith('capacitor://') ||
                (env_js_1.config.corsOrigin && origin === env_js_1.config.corsOrigin)) {
                return callback(null, true);
            }
            return callback(null, true);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
        exposedHeaders: ['Set-Cookie'],
    });
    app.use(corsMiddleware);
    app.options('*', corsMiddleware);
    // Rate limiting for auth routes (prevent brute force)
    const authLimiter = (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            message: 'Too many requests from this IP, please try again after 15 minutes',
            error: { code: 'RATE_LIMIT_EXCEEDED' },
        },
    });
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
    app.use((0, cookie_parser_1.default)(env_js_1.config.cookieSecret));
    // Root status check (fallback if frontend dist not present)
    app.get('/api', (req, res) => {
        res.status(200).json({
            status: 'online',
            service: 'Primordial Dubbers India — API',
            version: '1.0.3',
            health: '/api/v1/health',
            ranks: '/api/v1/ranks',
            docs: 'https://github.com/primordialdubbers-crypto/primordial-Dubbers',
        });
    });
    // System Health and liveness endpoints for Railway / cloud runners
    app.get(['/healthz', '/ping'], (req, res) => {
        res.status(200).send('OK');
    });
    // Health check
    app.get('/api/v1/health', (req, res) => {
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'pdi-voice-artist-ranking-api',
            version: '1.0.4',
        });
    });
    // Public system rank rules endpoint (accessible to visitors per PRD)
    app.get('/api/v1/ranks', (req, res) => {
        res.status(200).json({
            success: true,
            data: {
                ranks: shared_1.RANK_TIERS,
                awards: shared_1.AWARDS_CATALOG,
                deductions: shared_1.DEDUCTIONS_CATALOG,
            },
        });
    });
    // Static file serving for dev/test uploaded media
    app.use('/uploads', express_1.default.static(path_1.default.resolve(process.cwd(), 'uploads')));
    // API v1 routes
    app.use('/api/v1/auth', authLimiter, authRoutes_js_1.default);
    app.use('/api/v1/leaderboard', leaderboardRoutes_js_1.default);
    app.use('/api/v1', artistRoutes_js_1.default);
    app.use('/api/v1', pointsRoutes_js_1.default);
    app.use('/api/v1', appealRoutes_js_1.default);
    app.use('/api/v1', challengeRoutes_js_1.default);
    app.use('/api/v1', submissionRoutes_js_1.default);
    app.use('/api/v1', evaluationRoutes_js_1.default);
    app.use('/api/v1/notifications', notificationRoutes_js_1.default);
    app.use('/api/v1/director', directorTalentRoutes_js_1.default);
    app.use('/api/v1/admin', adminUserRoutes_js_1.default);
    app.use('/api/v1', roleProtectedRoutes_js_1.default);
    // Serve Frontend React SPA if dist folder exists
    const candidateDistPaths = [
        path_1.default.resolve(process.cwd(), '../web/dist'),
        path_1.default.resolve(process.cwd(), 'apps/web/dist'),
        path_1.default.resolve(__dirname, '../../web/dist'),
        path_1.default.resolve(__dirname, '../../../apps/web/dist'),
    ];
    const webDistPath = candidateDistPaths.find((p) => fs_1.default.existsSync(path_1.default.join(p, 'index.html')));
    if (webDistPath) {
        app.use(express_1.default.static(webDistPath, {
            setHeaders: (res, filePath) => {
                if (filePath.endsWith('.html')) {
                    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                }
                else {
                    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                }
            },
        }));
        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
                return next();
            }
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.sendFile(path_1.default.join(webDistPath, 'index.html'));
        });
    }
    // Fallback 404 handler for unmatched API routes
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            message: `Route not found: ${req.method} ${req.originalUrl}`,
            error: { code: 'NOT_FOUND' },
        });
    });
    // Global error handler
    app.use(errorHandler_js_1.errorHandler);
    return app;
}
