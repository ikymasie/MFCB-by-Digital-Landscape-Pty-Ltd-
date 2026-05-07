"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const NEON_CONNECTION_STRING = 'postgresql://neondb_owner:npg_Uhl4LoVnKZg8@ep-withered-glade-apsk712t-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const config = {
    client: 'pg',
    connection: process.env.DATABASE_URL ?? NEON_CONNECTION_STRING,
    migrations: {
        directory: './src/migrations',
        extension: 'ts',
    },
    seeds: {
        directory: './src/seeds',
        extension: 'ts',
    },
    pool: {
        min: 1,
        max: 5,
    },
};
exports.default = config;
//# sourceMappingURL=knexfile.js.map