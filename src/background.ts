import { BskyAgent } from '@atproto/api';
import browser from 'webextension-polyfill';
import { editPost, getPost, uploadBlob } from './api/bsky';

console.log("[BlueSky Edit] Background script starting...");

const agent = new BskyAgent({ service: 'https://bsky.social' });

browser.runtime.onMessage.addListener(async (request: any) => {
    console.log("[BlueSky Edit] Background received message:", request.type);
    try {
        if (request.type === 'EDIT_POST') {
            await handleEditPost(request);
            return { success: true };
        } else if (request.type === 'GET_POST') {
            const data = await handleGetPost(request);
            return { success: true, data };
        } else if (request.type === 'UPLOAD_IMAGE') {
            return await handleUploadImage(request);
        }
    } catch (err: any) {
        console.error('[BlueSky Edit] Message Listener Error:', err);
        return { success: false, error: err.message || 'Unknown background error' };
    }
});

async function getAgent(handle?: string, appPassword?: string) {
    if (agent.hasSession) return agent;

    if (!handle || !appPassword) {
        const creds = await browser.storage.local.get(['appPassword', 'handle']);
        handle = creds.handle as string;
        appPassword = creds.appPassword as string;
    }

    if (!appPassword || !handle) {
        return null;
    }

    await agent.login({ identifier: handle, password: appPassword });
    return agent;
}

async function handleGetPost(request: any) {
    const { uri } = request;
    const client = await getAgent();
    if (!client) return null;
    return await getPost(uri, client);
}

async function handleEditPost(request: any) {
    const { originalUri, newText, newEmbed } = request;
    const client = await getAgent();
    if (!client) throw new Error('AUTH_REQUIRED');
    await editPost(originalUri, newText, client, newEmbed);
}

async function handleUploadImage(message: any) {
    try {
        const client = await getAgent();
        if (!client) return { success: false, error: 'AUTH_REQUIRED' };

        const { base64Data, encoding } = message;

        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const blob = await uploadBlob(bytes, encoding, client);
        return { success: true, blob };
    } catch (err: any) {
        console.error('[BlueSky Edit] handleUploadImage Error:', err);
        return { success: false, error: err.message };
    }
}
