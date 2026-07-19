export type ActionResponse<T = any> =  { success: boolean; data?: T; error?: string; fieldErrors?: Record<string, string[]> };
