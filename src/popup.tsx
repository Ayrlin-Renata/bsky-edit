import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import browser from 'webextension-polyfill';
import { AuthForm, ThemeColors } from './components/AuthForm';

type ThemeMode = 'auto' | 'light' | 'dim' | 'dark';

const Popup = () => {
    const [appPassword, setAppPassword] = useState('');
    const [handle, setHandle] = useState('');
    const [status, setStatus] = useState('');
    const [saving, setSaving] = useState(false);

    const [themeMode, setThemeMode] = useState<ThemeMode>('auto');
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dim' | 'dark'>('light');

    useEffect(() => {
        const loadSettings = async () => {
            const result = await browser.storage.local.get(['appPassword', 'handle', 'themeMode']);
            if (result.appPassword) setAppPassword(result.appPassword as string);
            if (result.handle) setHandle(result.handle as string);
            if (result.themeMode) setThemeMode(result.themeMode as ThemeMode);
        };
        loadSettings();
    }, []);

    useEffect(() => {
        const updateTheme = async () => {
            await browser.storage.local.set({ themeMode });

            let mode = themeMode;
            if (mode === 'auto') {
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    mode = 'dark';
                } else {
                    mode = 'light';
                }
            }
            setResolvedTheme(mode as any);
        };
        updateTheme();
    }, [themeMode]);

    const handleSave = async () => {
        setSaving(true);
        await browser.storage.local.set({ appPassword, handle });
        setSaving(false);
        setStatus('Saved!');
        setTimeout(() => setStatus(''), 2000);
    };

    const toggleTheme = () => {
        const modes: ThemeMode[] = ['auto', 'light', 'dim', 'dark'];
        const nextIndex = (modes.indexOf(themeMode) + 1) % modes.length;
        setThemeMode(modes[nextIndex]);
    };

    const colors: Record<string, ThemeColors> = {
        light: { bg: '#ffffff', text: '#0b0f14', border: '#d2d6db', inputBg: '#f1f3f5', buttonBg: '#0070ff', buttonText: '#ffffff', secondaryText: '#42576c' },
        dark: { bg: '#000000', text: '#f1f3f5', border: '#2e4052', inputBg: '#161e27', buttonBg: '#0070ff', buttonText: '#ffffff', secondaryText: '#aec1d5' },
        dim: { bg: '#151D28', text: '#ffffff', border: '#394960', inputBg: '#1e2734', buttonBg: '#0070ff', buttonText: '#ffffff', secondaryText: '#8fa0b3' }
    };
    const theme = colors[resolvedTheme];

    useEffect(() => {
        document.body.style.backgroundColor = theme.bg;
        document.documentElement.style.backgroundColor = theme.bg;
        document.body.style.margin = '0';
        document.body.style.padding = '0';
    }, [theme.bg]);

    return (
        <div style={{
            padding: '24px',
            width: '340px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            backgroundColor: theme.bg,
            color: theme.text,
            minHeight: '100vh',
            boxSizing: 'border-box',
            borderRadius: '8px',
            border: '1px solid ' + theme.border
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>BlueSky Edit Setup</h1>
                <button
                    onClick={toggleTheme}
                    title={`Switch Theme (Current: ${themeMode})`}
                    style={{
                        background: theme.inputBg,
                        border: '1px solid ' + theme.border,
                        borderRadius: '14px',
                        padding: '5px 12px',
                        cursor: 'pointer',
                        color: theme.text,
                        fontSize: '11px',
                        fontWeight: 700,
                        transition: 'background-color 0.1s'
                    }}
                >
                    THEME: {themeMode.toUpperCase()}
                </button>
            </div>

            <AuthForm
                handle={handle}
                setHandle={setHandle}
                appPassword={appPassword}
                setAppPassword={setAppPassword}
                onSave={handleSave}
                saving={saving}
                theme={theme}
                saveLabel="Save Credentials"
                showCancel={false}
            />

            {status && <div style={{ marginTop: '10px', color: '#25cf68', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>{status}</div>}

            <div style={{ marginTop: '24px', borderTop: '1px solid ' + theme.border, paddingTop: '16px', textAlign: 'center' }}>
                <a
                    href="https://ko-fi.com/ayrlin"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        textDecoration: 'none',
                        color: theme.secondaryText,
                        fontSize: '13px',
                        fontWeight: 500,
                        transition: 'color 0.1s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = theme.text}
                    onMouseLeave={(e) => e.currentTarget.style.color = theme.secondaryText}
                >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.724c-.304 0-.55.246-.55.55v13.046c0 .304.246.55.55.55h15.244s1.241-.018 2.215-.758c.95-.722 2.378-2.671 2.378-2.671a5.62 5.62 0 0 0 3.32-4.114 5.614 5.614 0 0 0-.001-2.01ZM18.48 11.23a4.73 4.73 0 1 1-9.46 0 4.73 4.73 0 1 1 9.46 0ZM19.67 12.18s-.244 1.89-1.393 2.762c-.792.6-1.555.549-1.555.549h-2.186a5.578 5.578 0 0 0 1.056-3.235c0-.141-.006-.281-.017-.42h3.58a3.174 3.174 0 0 1 .515 1.411v1.933H19.67Z" />
                    </svg>
                    Support the developer on Ko-fi
                </a>
            </div>
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<Popup />);
}
