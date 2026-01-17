import React, { useState, useEffect, useRef } from 'react';
import { AuthForm, ThemeColors } from './AuthForm';
import { HighlightTextarea } from './HighlightTextarea';
import { compressImage } from '../utils/image';

import {
    EmbedView,
    EmbedRecordData,
    ViewImage,
    ViewRecord,
    EmbedViewImages,
    EmbedViewRecordWithMedia,
    EmbedViewRecord,
    EmbedViewExternal,
    ViewExternal
} from '../types/bsky';

interface EditModalProps {
    originalText: string;
    originalEmbed?: EmbedView;
    originalEmbedRecord?: EmbedRecordData;
    isAuthMissing: boolean;
    onClose: () => void;
    onSave: (newText: string, newEmbed?: any) => void;
    onAuthSave: (creds: { handle: string, appPassword: string }) => Promise<void>;
}

type ThemeMode = 'auto' | 'light' | 'dim' | 'dark';

export const EditModal: React.FC<EditModalProps> = ({ originalText, originalEmbed, originalEmbedRecord, isAuthMissing, onClose, onSave, onAuthSave }) => {
    const [text, setText] = useState(originalText);
    const [viewEmbed, setViewEmbed] = useState<EmbedView | undefined>(originalEmbed);
    const [recordEmbed, setRecordEmbed] = useState<EmbedRecordData | undefined>(originalEmbedRecord);

    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const [needsAuth, setNeedsAuth] = useState(isAuthMissing);
    const [handle, setHandle] = useState('');
    const [appPassword, setAppPassword] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const colors: Record<string, ThemeColors> = {
        light: { bg: '#ffffff', text: '#0b0f14', border: '#d2d6db', inputBg: '#f1f3f5', buttonBg: '#0070ff', buttonText: '#ffffff', secondaryText: '#42576c' },
        dark: { bg: '#000000', text: '#f1f3f5', border: '#2e4052', inputBg: '#161e27', buttonBg: '#0070ff', buttonText: '#ffffff', secondaryText: '#aec1d5' },
        dim: { bg: '#151D28', text: '#ffffff', border: '#394960', inputBg: '#1e2734', buttonBg: '#0070ff', buttonText: '#ffffff', secondaryText: '#8fa0b3' }
    };
    const getInitialTheme = (): 'light' | 'dim' | 'dark' => {
        const html = document.documentElement;
        const body = document.body;

        if (html.classList.contains('theme--dim') || (body && body.classList.contains('theme--dim'))) return 'dim';
        if (html.classList.contains('theme--dark') || (body && body.classList.contains('theme--dark'))) return 'dark';

        if (body) {
            const bg = window.getComputedStyle(body).backgroundColor;
            if (bg === 'rgb(21, 29, 40)') return 'dim';
            if (bg === 'rgb(0, 0, 0)' || bg === 'rgb(22, 30, 39)') return 'dark';
        }

        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';

        return 'light';
    };
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dim' | 'dark'>(getInitialTheme);

    useEffect(() => {
        chrome.storage.local.get(['themeMode'], (result) => {
            const storedMode = result.themeMode as ThemeMode;
            if (storedMode && storedMode !== 'auto') setResolvedTheme(storedMode);
            else setResolvedTheme(getInitialTheme());
        });
    }, []);

    const theme = colors[resolvedTheme];

    const handleSave = async () => {
        setSaving(true);
        console.log('[BlueSky Edit] handleSave called with recordEmbed:', recordEmbed);
        await onSave(text, recordEmbed ?? null);
        setSaving(false);
        onClose();
    };

    const handleAuthSubmit = async () => {
        if (!handle || !appPassword) return;
        setSaving(true);
        await onAuthSave({ handle, appPassword });
        setSaving(false);
        setNeedsAuth(false);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) await uploadFiles(files);
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        const files: File[] = [];

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) files.push(blob);
            }
        }

        if (files.length > 0) {
            await uploadFiles(files);
        }
    };

    const uploadFiles = async (files: FileList | File[]) => {
        let currentCount = 0;
        if (viewEmbed) {
            if (viewEmbed.$type === 'app.bsky.embed.images#view') currentCount = (viewEmbed as EmbedViewImages).images.length;
            else if (viewEmbed.$type === 'app.bsky.embed.recordWithMedia#view' && (viewEmbed as EmbedViewRecordWithMedia).media.$type === 'app.bsky.embed.images#view') {
                currentCount = ((viewEmbed as EmbedViewRecordWithMedia).media as EmbedViewImages).images.length;
            }
        }

        const remaining = 4 - currentCount;
        if (remaining <= 0) {
            alert('Maximum 4 images allowed.');
            return;
        }

        setUploading(true);
        const toUpload = Array.from(files).slice(0, remaining);

        for (const file of toUpload) {
            try {
                const { blob, isCompressed } = await compressImage(file);
                const dims: { w: number, h: number } = await new Promise((resolve) => {
                    const img = new Image();
                    img.src = URL.createObjectURL(blob);
                    img.onload = () => {
                        resolve({ w: img.width, h: img.height });
                        URL.revokeObjectURL(img.src);
                    };
                });

                const base64Data = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(blob);
                });

                const response = await new Promise<any>((resolve) => {
                    chrome.runtime.sendMessage({
                        type: 'UPLOAD_IMAGE',
                        base64Data,
                        encoding: blob.type
                    }, resolve);
                });

                if (response.success) {
                    const localUrl = URL.createObjectURL(blob);
                    addImageToEmbed(localUrl, response.blob, dims, isCompressed);
                }
            } catch (err) {
                console.error('Upload error:', err);
            }
        }
        setUploading(false);
    };

    const addImageToEmbed = (localUrl: string, blob: any, dims: { w: number, h: number }, isCompressed: boolean) => {
        const newViewImg: ViewImage = { thumb: localUrl, fullsize: localUrl, alt: '', isCompressed };
        const newRecordImg = { alt: '', image: blob, aspectRatio: { width: dims.w, height: dims.h } };

        setViewEmbed((prev: any) => {
            if (!prev) return { $type: 'app.bsky.embed.images#view', images: [newViewImg] };
            if (prev.$type === 'app.bsky.embed.images#view') return { ...prev, images: [...prev.images, newViewImg] };
            if (prev.$type === 'app.bsky.embed.recordWithMedia#view') {
                if (prev.media.$type === 'app.bsky.embed.images#view') {
                    return { ...prev, media: { ...prev.media, images: [...prev.media.images, newViewImg] } };
                }
                return { ...prev, media: { $type: 'app.bsky.embed.images#view', images: [newViewImg] } };
            }
            if (prev.$type === 'app.bsky.embed.record#view') {
                return {
                    $type: 'app.bsky.embed.recordWithMedia#view',
                    media: { $type: 'app.bsky.embed.images#view', images: [newViewImg] },
                    record: { record: prev.record }
                };
            }
            return { $type: 'app.bsky.embed.images#view', images: [newViewImg] };
        });

        setRecordEmbed((prev: any) => {
            if (!prev) return { $type: 'app.bsky.embed.images', images: [newRecordImg] };
            if (prev.$type === 'app.bsky.embed.images') return { ...prev, images: [...prev.images, newRecordImg] };
            if (prev.$type === 'app.bsky.embed.recordWithMedia') {
                if (prev.media.$type === 'app.bsky.embed.images') {
                    return { ...prev, media: { ...prev.media, images: [...prev.media.images, newRecordImg] } };
                }
                return { ...prev, media: { $type: 'app.bsky.embed.images', images: [newRecordImg] } };
            }
            if (prev.$type === 'app.bsky.embed.record') {
                return {
                    $type: 'app.bsky.embed.recordWithMedia',
                    media: { $type: 'app.bsky.embed.images', images: [newRecordImg] },
                    record: prev.record
                };
            }
            return { $type: 'app.bsky.embed.images', images: [newRecordImg] };
        });
    };

    const removeImage = (index: number) => {
        setViewEmbed((prev: any) => {
            if (!prev) return undefined;
            if (prev.$type === 'app.bsky.embed.images#view') {
                const nextImgs = [...prev.images];
                nextImgs.splice(index, 1);
                return nextImgs.length > 0 ? { ...prev, images: nextImgs } : undefined;
            }
            if (prev.$type === 'app.bsky.embed.recordWithMedia#view' && prev.media.$type === 'app.bsky.embed.images#view') {
                const nextImgs = [...prev.media.images];
                nextImgs.splice(index, 1);
                if (nextImgs.length > 0) return { ...prev, media: { ...prev.media, images: nextImgs } };
                return { $type: 'app.bsky.embed.record#view', record: prev.record.record };
            }
            return prev;
        });

        setRecordEmbed((prev: any) => {
            if (!prev) return undefined;
            if (prev.$type === 'app.bsky.embed.images') {
                const nextImgs = [...prev.images];
                nextImgs.splice(index, 1);
                return nextImgs.length > 0 ? { ...prev, images: nextImgs } : undefined;
            }
            if (prev.$type === 'app.bsky.embed.recordWithMedia' && prev.media.$type === 'app.bsky.embed.images') {
                const nextImgs = [...prev.media.images];
                nextImgs.splice(index, 1);
                if (nextImgs.length > 0) return { ...prev, media: { ...prev.media, images: nextImgs } };
                return { $type: 'app.bsky.embed.record', record: prev.record };
            }
            return prev;
        });
    };

    const removeQuote = () => {
        setViewEmbed((prev: any) => {
            if (!prev) return undefined;
            console.log('[BlueSky Edit] removeQuote View prev:', prev);
            if (prev.$type === 'app.bsky.embed.record#view') return undefined;
            if (prev.$type === 'app.bsky.embed.recordWithMedia#view') {
                // Return only the media portion
                return { ...prev.media };
            }
            return prev;
        });

        setRecordEmbed((prev: any) => {
            if (!prev) return undefined;
            console.log('[BlueSky Edit] removeQuote Record prev:', prev);
            if (prev.$type === 'app.bsky.embed.record') return undefined;
            if (prev.$type === 'app.bsky.embed.recordWithMedia') {
                // Return only the media portion
                return { ...prev.media };
            }
            return prev;
        });
    };

    const removeExternal = () => {
        setViewEmbed((prev: any) => {
            if (!prev) return undefined;
            if (prev.$type === 'app.bsky.embed.external#view') return undefined;
            if (prev.$type === 'app.bsky.embed.recordWithMedia#view' && prev.media.$type === 'app.bsky.embed.external#view') {
                return { ...prev.record };
            }
            return prev;
        });

        setRecordEmbed((prev: any) => {
            if (!prev) return undefined;
            if (prev.$type === 'app.bsky.embed.external') return undefined;
            if (prev.$type === 'app.bsky.embed.recordWithMedia' && prev.media.$type === 'app.bsky.embed.external') {
                return { ...prev.record };
            }
            return prev;
        });
    };

    const renderAttachments = () => {
        let images: any[] | null = null;
        if (viewEmbed) {
            if (viewEmbed.$type === 'app.bsky.embed.images#view') images = (viewEmbed as EmbedViewImages).images;
            else if (viewEmbed.$type === 'app.bsky.embed.recordWithMedia#view' && (viewEmbed as EmbedViewRecordWithMedia).media.$type === 'app.bsky.embed.images#view') {
                images = ((viewEmbed as EmbedViewRecordWithMedia).media as EmbedViewImages).images;
            }
        }

        let quoteRecord: ViewRecord | null = null;
        if (viewEmbed) {
            if (viewEmbed.$type === 'app.bsky.embed.record#view') {
                const rec = (viewEmbed as EmbedViewRecord).record;
                if ('author' in rec) quoteRecord = rec as ViewRecord;
                else if ('record' in rec && (rec as any).$type === 'app.bsky.embed.record#view') quoteRecord = rec as any;
            } else if (viewEmbed.$type === 'app.bsky.embed.recordWithMedia#view') {
                quoteRecord = (viewEmbed as EmbedViewRecordWithMedia).record.record as ViewRecord;
            }
        }

        const imageEls = (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {(images || []).map((img, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '100px', height: '100px' }}>
                        <img src={img.thumb} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: `1px solid ${theme.border}` }} />
                        {img.isCompressed && (
                            <div style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '10px', padding: '2px 4px', borderRadius: '4px', fontWeight: 600 }}>RESIZED</div>
                        )}
                        <button onClick={() => removeImage(idx)} style={{
                            position: 'absolute', top: -6, right: -6, background: 'rgba(0,0,0,0.7)', color: 'white',
                            border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
                        }}>×</button>
                    </div>
                ))}

                {(!images || images.length < 4) && (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            width: '100px', height: '100px', border: `2px dashed ${theme.border}`,
                            borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'background-color 0.2s', backgroundColor: 'transparent'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,112,255,0.05)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        {uploading ? (
                            <div style={{ width: '24px', height: '24px', border: `2.5px solid ${theme.buttonBg}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'bsky-spin 0.6s linear infinite' }} />
                        ) : (
                            <svg viewBox="0 0 24 24" width="30" height="30" style={{ color: theme.secondaryText }}><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                        )}
                        <input type="file" ref={fileInputRef} hidden accept="image/*" multiple onChange={handleFileChange} />
                    </div>
                )}
                <style>{`@keyframes bsky-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );

        const quoteEl = quoteRecord ? (
            <div style={{ border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '12px', marginBottom: '12px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    {quoteRecord.author?.avatar && <img src={quoteRecord.author.avatar} style={{ width: '16px', height: '16px', borderRadius: '8px' }} />}
                    <div style={{ fontSize: '14px', fontWeight: 600, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>{quoteRecord.author?.displayName || quoteRecord.author?.handle}</div>
                    <div style={{ fontSize: '14px', color: theme.secondaryText }}>@{quoteRecord.author?.handle}</div>
                </div>
                {quoteRecord.value?.text && <div style={{ fontSize: '14px', color: theme.text, lineHeight: '18px', whiteSpace: 'pre-wrap', marginBottom: '8px' }}>{quoteRecord.value.text}</div>}
                {(() => {
                    const quoteImages = (quoteRecord.embeds || []).find((e: any) => e.$type === 'app.bsky.embed.images#view')?.images;
                    if (quoteImages?.length > 0) {
                        return (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {quoteImages.map((img: any, idx: number) => <img key={idx} src={img.thumb} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: `1px solid ${theme.border}` }} />)}
                            </div>
                        );
                    } else if (quoteRecord.embeds?.some((e: any) => e.$type.includes('images') || e.$type.includes('video'))) {
                        return <div style={{ color: theme.secondaryText, fontSize: '12px', fontStyle: 'italic' }}>[Image/Video Attachment]</div>;
                    }
                    return null;
                })()}
                <button onClick={removeQuote} style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', color: theme.secondaryText, border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>×</button>
            </div>
        ) : null;

        let externalData: ViewExternal | null = null;
        if (viewEmbed) {
            if (viewEmbed.$type === 'app.bsky.embed.external#view') externalData = (viewEmbed as EmbedViewExternal).external;
            else if (viewEmbed.$type === 'app.bsky.embed.recordWithMedia#view' && (viewEmbed as EmbedViewRecordWithMedia).media.$type === 'app.bsky.embed.external#view') {
                externalData = ((viewEmbed as EmbedViewRecordWithMedia).media as EmbedViewExternal).external;
            }
        }

        const externalEl = externalData ? (
            <div style={{ border: `1px solid ${theme.border}`, borderRadius: '8px', overflow: 'hidden', marginBottom: '12px', position: 'relative', backgroundColor: theme.inputBg }}>
                {externalData.thumb && <img src={externalData.thumb} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />}
                <div style={{ padding: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{externalData.title}</div>
                    <div style={{ fontSize: '12px', color: theme.secondaryText }}>{externalData.description}</div>
                </div>
                <button onClick={removeExternal} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}>×</button>
            </div>
        ) : null;

        return <div>{imageEls}{externalEl}{quoteEl}</div>;
    };

    return (
        <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(2px)' }}
            onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { if (e.currentTarget === e.target) setIsDragging(false); }}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); }}
        >
            <div style={{ backgroundColor: theme.bg, padding: '24px', borderRadius: '12px', width: '500px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', color: theme.text, fontFamily: '-apple-system, sans-serif', border: `1px solid ${isDragging ? theme.buttonBg : theme.border}`, boxShadow: '0 0 30px rgba(0,0,0,0.4)', position: 'relative' }}>
                {isDragging && <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,112,255,0.1)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', borderRadius: '12px', border: `2px dashed ${theme.buttonBg}` }}><div style={{ backgroundColor: theme.buttonBg, color: 'white', padding: '8px 16px', borderRadius: '20px', fontWeight: 600 }}>Drop images to upload</div></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}><h2 style={{ margin: 0, fontSize: '18px' }}>{needsAuth ? 'Connect BlueSky' : 'Edit Post'}</h2></div>
                {needsAuth ? (
                    <AuthForm handle={handle} setHandle={setHandle} appPassword={appPassword} setAppPassword={setAppPassword} onSave={handleAuthSubmit} onCancel={onClose} saving={saving} theme={theme} saveLabel="Save & Continue" showCancel={true} />
                ) : (
                    <div>
                        <HighlightTextarea value={text} onChange={setText} theme={theme} onPaste={handlePaste} />
                        {renderAttachments()}
                        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(255, 171, 0, 0.1)', borderLeft: '4px solid #FFAB00', borderRadius: '4px', color: theme.text }}><p style={{ margin: 0, fontSize: '13px', lineHeight: '18px' }}><strong>Warning:</strong> Editing will <strong>reset all likes, reposts, and update the post date/time</strong>.</p></div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                fontSize: '13px',
                                color: text.length > 300 ? '#ff4444' : theme.secondaryText,
                                fontWeight: text.length > 300 ? 700 : 400
                            }}>
                                {text.length} / 300
                            </div>
                            <button onClick={onClose} style={{ padding: '10px 20px', cursor: 'pointer', background: 'transparent', color: theme.text, border: 'none', fontWeight: 600 }}>Cancel</button>
                            <button onClick={handleSave} disabled={saving || uploading} style={{ padding: '10px 24px', cursor: 'pointer', backgroundColor: theme.buttonBg, color: theme.buttonText, border: 'none', borderRadius: '24px', fontWeight: 700, opacity: (saving || uploading) ? 0.7 : 1 }}>{saving ? 'Saving...' : 'Update'}</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
