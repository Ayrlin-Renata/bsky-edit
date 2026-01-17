import React, { useRef, useEffect } from 'react';
import { ThemeColors } from './AuthForm';

interface HighlightTextareaProps {
    value: string;
    onChange: (v: string) => void;
    theme: ThemeColors;
    placeholder?: string;
    onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
}

export const HighlightTextarea: React.FC<HighlightTextareaProps> = ({ value, onChange, theme, placeholder = "What's up?", onPaste }) => {
    const backdropRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        if (textareaRef.current && backdropRef.current) {
            backdropRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    };

    // Auto-expand height
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const newHeight = Math.max(120, textareaRef.current.scrollHeight);
            textareaRef.current.style.height = `${newHeight}px`;
            if (backdropRef.current) {
                backdropRef.current.style.height = `${newHeight}px`;
            }
            if (containerRef.current) {
                containerRef.current.style.height = `${newHeight}px`;
            }
        }
    }, [value]);

    const renderHighlights = (text: string) => {
        const LIMIT = 300;
        const normalText = text.slice(0, LIMIT);
        const overLimitText = text.slice(LIMIT);

        const highlightPart = (t: string, offset: number) => {
            // Regex for hashtags and markdown links
            // Matches #hashtags OR [title](url)
            const parts = t.split(/(#[\p{L}\p{M}\p{N}_]*[\p{L}\p{M}_][\p{L}\p{M}\p{N}_]*|\[[^\]]+\]\([^)]+\))/gu);
            return parts.map((part, i) => {
                if (part.startsWith('#') && part.length > 1) {
                    return <span key={`${offset}-${i}`} style={{ color: '#0085ff', fontWeight: 500 }}>{part}</span>;
                }
                if (part.startsWith('[') && part.includes('](')) {
                    return <span key={`${offset}-${i}`} style={{ color: '#0085ff', textDecoration: 'underline' }}>{part}</span>;
                }
                return part;
            });
        };

        return (
            <>
                {highlightPart(normalText, 0)}
                {overLimitText.length > 0 && (
                    <span style={{ backgroundColor: 'rgba(255, 0, 0, 0.15)', color: '#ff4444' }}>
                        {highlightPart(overLimitText, LIMIT)}
                    </span>
                )}
            </>
        );
    };

    const sharedStyles: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        padding: '12px',
        borderRadius: '6px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontSize: '16px',
        lineHeight: '1.5',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        boxSizing: 'border-box',
        border: '1px solid transparent',
        margin: 0,
        textAlign: 'left',
        letterSpacing: 'normal',
        textTransform: 'none',
        wordSpacing: 'normal'
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', minHeight: '120px', marginBottom: '12px' }}>
            <div
                ref={backdropRef}
                style={{
                    ...sharedStyles,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                    zIndex: 1
                }}
            >
                {renderHighlights(value)}
                <br />
            </div>

            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onScroll={handleScroll}
                style={{
                    ...sharedStyles,
                    backgroundColor: 'transparent',
                    color: 'transparent',
                    caretColor: theme.text,
                    resize: 'none',
                    outline: 'none',
                    zIndex: 2,
                    overflow: 'hidden',
                    display: 'block'
                }}
                placeholder={placeholder}
                spellCheck={false}
                onPaste={onPaste}
            />
        </div>
    );
};
