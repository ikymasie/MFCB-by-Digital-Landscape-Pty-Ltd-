declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        type: 'USER' | 'API_CLIENT';
        role: string;
        institutionId: string | null;
        permissions: string[];
      };
      correlationId?: string;
    }
  }
}

export {};
