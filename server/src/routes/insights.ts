import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { InsightService } from '../services/InsightService';
import { LlmService, ChatMessage } from '../services/LlmService';

const router = Router();
const insightService = new InsightService();
const llmService = new LlmService();

const MAX_CHAT_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;

function sanitizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === 'object' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0
    )
    .slice(-MAX_CHAT_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));
}

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const result = await insightService.getInsights();
  return res.json({ success: true, data: result });
}));

router.get('/llm-status', asyncHandler(async (_req: Request, res: Response) => {
  const status = await llmService.getStatus();
  return res.json({ success: true, data: status });
}));

router.post('/analysis', asyncHandler(async (_req: Request, res: Response) => {
  if (!llmService.isEnabled()) {
    return res.json({
      success: true,
      data: { enabled: false, model: llmService.getModel(), analysis: '' },
    });
  }
  const { metrics, datasets } = await insightService.buildLlmContext();
  const result = await llmService.generateAnalysis(metrics, datasets);
  return res.json({ success: true, data: result });
}));

router.post('/chat', asyncHandler(async (req: Request, res: Response) => {
  if (!llmService.isEnabled()) {
    return res.json({
      success: true,
      data: { enabled: false, model: llmService.getModel(), reply: '' },
    });
  }
  const messages = sanitizeMessages(req.body?.messages);
  if (messages.length === 0) {
    return res.status(400).json({
      success: false,
      error: { message: 'A non-empty "messages" array is required' },
    });
  }
  const { metrics, datasets } = await insightService.buildLlmContext();
  const result = await llmService.chat(messages, metrics, datasets);
  return res.json({ success: true, data: result });
}));

export default router;
