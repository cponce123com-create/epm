import { Router, Request, Response } from 'express';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
