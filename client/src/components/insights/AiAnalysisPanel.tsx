import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Alert,
    CircularProgress,
    Chip,
    TextField,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    AutoAwesome as AiIcon,
    Send as SendIcon,
    Bolt as GpuIcon,
    Memory as CpuIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { LlmStatus, ChatMessage } from '../../types';
import { insightService } from '../../services/insightService';
import { GlassSurface } from '../ui/GlassSurface';

export const AiAnalysisPanel: React.FC = () => {
    const { t } = useTranslation();
    const [status, setStatus] = useState<LlmStatus | null>(null);
    const [statusLoading, setStatusLoading] = useState(true);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const threadEndRef = useRef<HTMLDivElement>(null);

    const refreshStatus = useCallback(async () => {
        try {
            const res = await insightService.getLlmStatus();
            setStatus(res.data ?? null);
        } catch {
            setStatus({ enabled: false, available: false, model: '', processor: null, gpuPercent: null });
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await refreshStatus();
            if (!cancelled) setStatusLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [refreshStatus]);

    useEffect(() => {
        threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, busy]);

    const enabled = status?.enabled && status?.available;

    const send = async (content: string) => {
        const text = content.trim();
        if (!text || busy) return;
        const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
        setMessages(nextMessages);
        setInput('');
        setBusy(true);
        setError(null);
        try {
            const res = await insightService.chat(nextMessages);
            const reply = res.data?.reply ?? '';
            setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('pages.insights.ai.error'));
            // Roll back the optimistic user message so they can retry/edit.
            setMessages((prev) => prev.slice(0, -1));
            setInput(text);
        } finally {
            setBusy(false);
            // The model is loaded after the first call; refresh to reveal GPU/CPU placement.
            void refreshStatus();
        }
    };

    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void send(input);
        }
    };

    return (
        <GlassSurface sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1} mb={1} flexWrap="wrap">
                <AiIcon color="primary" />
                <Typography variant="h6">{t('pages.insights.ai.title')}</Typography>
                {status?.model && enabled && (
                    <Chip size="small" label={status.model} variant="outlined" sx={{ ml: 1 }} />
                )}
                {enabled && <ProcessorChip status={status} />}
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('pages.insights.ai.subtitle')}
            </Typography>

            {statusLoading ? (
                <Box display="flex" justifyContent="center" p={2}>
                    <CircularProgress size={24} />
                </Box>
            ) : !enabled ? (
                <Alert severity="info">
                    {status?.enabled
                        ? t('pages.insights.ai.unavailable')
                        : t('pages.insights.ai.disabled')}
                </Alert>
            ) : (
                <>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    {messages.length === 0 && !busy && (
                        <Button
                            variant="contained"
                            startIcon={<AiIcon />}
                            onClick={() =>
                                void send(t('pages.insights.ai.analysisPrompt'))
                            }
                            sx={{ mb: 2 }}
                        >
                            {t('pages.insights.ai.generate')}
                        </Button>
                    )}

                    {messages.length > 0 && (
                        <Box sx={{ mb: 2, maxHeight: 480, overflowY: 'auto', pr: 1 }}>
                            {messages.map((m, i) => (
                                <MessageBubble key={i} message={m} youLabel={t('pages.insights.ai.you')} />
                            ))}
                            {busy && (
                                <Box display="flex" alignItems="center" gap={1} sx={{ mt: 1 }}>
                                    <CircularProgress size={16} />
                                    <Typography variant="caption" color="text.secondary">
                                        {t('pages.insights.ai.thinking')}
                                    </Typography>
                                </Box>
                            )}
                            <div ref={threadEndRef} />
                        </Box>
                    )}

                    <Box display="flex" gap={1} alignItems="flex-end">
                        <TextField
                            fullWidth
                            size="small"
                            multiline
                            maxRows={4}
                            placeholder={t('pages.insights.ai.askPlaceholder')}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                            disabled={busy}
                        />
                        <IconButton
                            color="primary"
                            onClick={() => void send(input)}
                            disabled={busy || !input.trim()}
                            aria-label={t('pages.insights.ai.send')}
                        >
                            {busy ? <CircularProgress size={20} /> : <SendIcon />}
                        </IconButton>
                    </Box>

                    {messages.length > 0 && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
                            {t('pages.insights.ai.disclaimer')}
                        </Typography>
                    )}
                </>
            )}
        </GlassSurface>
    );
};

const ProcessorChip: React.FC<{ status: LlmStatus | null }> = ({ status }) => {
    const { t } = useTranslation();
    if (!status) return null;

    const { processor, gpuPercent } = status;

    if (processor === 'gpu') {
        return (
            <Tooltip title={t('pages.insights.ai.processor.gpuTooltip')}>
                <Chip size="small" color="success" icon={<GpuIcon />} label={t('pages.insights.ai.processor.gpu')} />
            </Tooltip>
        );
    }
    if (processor === 'partial') {
        return (
            <Tooltip title={t('pages.insights.ai.processor.partialTooltip')}>
                <Chip
                    size="small"
                    color="warning"
                    icon={<GpuIcon />}
                    label={t('pages.insights.ai.processor.partial', { percent: gpuPercent ?? 0 })}
                />
            </Tooltip>
        );
    }
    if (processor === 'cpu') {
        return (
            <Tooltip title={t('pages.insights.ai.processor.cpuTooltip')}>
                <Chip size="small" color="warning" variant="outlined" icon={<CpuIcon />} label={t('pages.insights.ai.processor.cpu')} />
            </Tooltip>
        );
    }
    // Not loaded yet (model loads on first request).
    return (
        <Tooltip title={t('pages.insights.ai.processor.idleTooltip')}>
            <Chip size="small" variant="outlined" label={t('pages.insights.ai.processor.idle')} />
        </Tooltip>
    );
};

interface MessageBubbleProps {
    message: ChatMessage;
    youLabel: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, youLabel }) => {
    const isUser = message.role === 'user';
    if (isUser) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
                <Box
                    sx={{
                        maxWidth: '85%',
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        px: 1.5,
                        py: 1,
                        borderRadius: 2,
                    }}
                >
                    <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
                        {youLabel}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                    </Typography>
                </Box>
            </Box>
        );
    }
    return (
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
            <AiIcon fontSize="small" color="primary" sx={{ mt: 0.5, flex: '0 0 auto' }} />
            <Box
                sx={{
                    flex: 1,
                    '& p': { mt: 0, mb: 1 },
                    '& ul,& ol': { mt: 0, mb: 1, pl: 3 },
                    '& h1,& h2,& h3': { mt: 1, mb: 0.5 },
                    '& code': { px: 0.5, borderRadius: 0.5, bgcolor: 'action.hover' },
                }}
            >
                <ReactMarkdown>{message.content}</ReactMarkdown>
            </Box>
        </Box>
    );
};
