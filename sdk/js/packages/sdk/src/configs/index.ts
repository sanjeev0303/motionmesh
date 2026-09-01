export interface EnvConfig {
    baseUrl: string;
}

export const getEnvConfig = (): EnvConfig => {
    return {
        baseUrl: process.env.MOTIONMESH_BASE_URL || "https://motionmesh.co.in/v1",
    };
};
