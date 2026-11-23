import { z } from 'zod';
export declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    PORT: z.ZodDefault<z.ZodNumber>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug", "verbose"]>>;
    GEMINI_API_KEY: z.ZodOptional<z.ZodString>;
    OPENAI_API_KEY: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "production" | "test";
    PORT: number;
    LOG_LEVEL: "error" | "warn" | "info" | "debug" | "verbose";
    GEMINI_API_KEY?: string | undefined;
    OPENAI_API_KEY?: string | undefined;
}, {
    NODE_ENV?: "development" | "production" | "test" | undefined;
    PORT?: number | undefined;
    LOG_LEVEL?: "error" | "warn" | "info" | "debug" | "verbose" | undefined;
    GEMINI_API_KEY?: string | undefined;
    OPENAI_API_KEY?: string | undefined;
}>;
export type EnvConfig = z.infer<typeof envSchema>;
export declare function validateEnv(config: Record<string, unknown>): EnvConfig;
