import { asyncWrapper } from '../middlewares/asyncWrapper.js';
import * as dashboardService from '../services/dashboardService.js';

export const getDashboard = asyncWrapper(async (req, res) => {
  const metrics = await dashboardService.getDashboardMetrics();
  res.status(200).json({
    success: true,
    data: metrics,
  });
});
