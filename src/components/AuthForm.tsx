import React from 'react';

export interface ThemeColors {
    bg: string;
    text: string;
    border: string;
    inputBg: string;
    buttonBg: string;
    buttonText: string;
    secondaryText: string;
}

interface AuthFormProps {
    handle: string;
    setHandle: (val: string) => void;
    appPassword: string;
    setAppPassword: (val: string) => void;
    onSave: () => void;
    onCancel?: () => void;
    saving: boolean;
    theme: ThemeColors;
    saveLabel?: string;
    showCancel?: boolean;
}

export const AuthForm: React.FC<AuthFormProps> = ({
    handle,
    setHandle,
    appPassword,
    setAppPassword,
    onSave,
    onCancel,
    saving,
    theme,
    saveLabel = 'Save Credentials',
    showCancel = false
}) => {
    return (
        <div>
            <p style={{ fontSize: '14px', color: theme.secondaryText, marginBottom: '12px' }}>
                Please enter a bsky.app App Password so BlueSky Edit can edit your posts.
            </p>
            <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px', color: theme.text }}>
                    Handle
                </label>
                <div style={{ position: 'relative' }}>
                    <input
                        type="text"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                        placeholder="you.bsky.social"
                        style={{
                            width: '100%',
                            padding: '10px',
                            paddingRight: '30px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: theme.inputBg,
                            color: theme.text,
                            outline: 'none',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit'
                        }}
                    />
                    {handle && (
                        <button
                            onClick={() => setHandle('')}
                            style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: theme.secondaryText,
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '0 4px'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    )}
                </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px', color: theme.text }}>
                    App Password
                </label>
                <div style={{ position: 'relative' }}>
                    <input
                        type="password"
                        value={appPassword}
                        onChange={(e) => setAppPassword(e.target.value)}
                        placeholder="xxxx-xxxx-xxxx-xxxx"
                        style={{
                            width: '100%',
                            padding: '10px',
                            paddingRight: '30px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: theme.inputBg,
                            color: theme.text,
                            outline: 'none',
                            boxSizing: 'border-box',
                            fontFamily: 'inherit'
                        }}
                    />
                    {appPassword && (
                        <button
                            onClick={() => setAppPassword('')}
                            style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: theme.secondaryText,
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '0 4px'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    )}
                </div>
                <p style={{ fontSize: '12px', color: theme.secondaryText, marginTop: '8px' }}>
                    Settings &gt; Privacy and Security &gt; App Passwords. This is NOT your main password.
                </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                {showCancel && onCancel && (
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '10px 16px',
                            background: 'transparent',
                            color: theme.text,
                            border: 'none',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Cancel
                    </button>
                )}
                <button
                    onClick={onSave}
                    disabled={saving}
                    style={{
                        padding: '10px 24px',
                        backgroundColor: theme.buttonBg,
                        color: theme.buttonText,
                        border: 'none',
                        borderRadius: '24px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        opacity: saving ? 0.7 : 1,
                        fontSize: '14px',
                        width: showCancel ? 'auto' : '100%'
                    }}
                >
                    {saving ? 'Saving...' : saveLabel}
                </button>
            </div>
        </div>
    );
};
