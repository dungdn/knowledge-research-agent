export interface HealthResponse {
    status: 'ok';
    service: string;
    version: string;
    uptime: number;
    timestamp: string;
}
export declare class HealthController {
    private readonly startTime;
    check(): HealthResponse;
}
