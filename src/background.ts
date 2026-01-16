import { BskyAgent } from '@atproto/api';
import { editPost, getPost, uploadBlob } from './api/bsky';

console.log("BlueSky Edit: Background script loaded");

const agent = new BskyAgent({ service: 'https://bsky.social' });

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    (async () => {
        try {
            if (request.type === 'EDIT_POST') {
                await handleEditPost(request);
                sendResponse({ success: true });
            } else if (request.type === 'GET_POST') {
                const data = await handleGetPost(request);
                sendResponse({ success: true, data });
            } else if (request.type === 'UPLOAD_IMAGE') {
                handleUploadImage(request, sendResponse);
                return;
            }
        } catch (err: any) {
            console.error(err);
            sendResponse({ success: false, error: err.message });
        }
    })();
    return true;
});

async function getAgent(handle?: string, appPassword?: string) {
    if (agent.hasSession) return agent;

    if (!handle || !appPassword) {
        const creds = await chrome.storage.local.get(['appPassword', 'handle']);
        handle = creds.handle as string;
        appPassword = creds.appPassword as string;
    }

    if (!appPassword || !handle) {
        throw new Error('Please set up your credentials in the extension popup.');
    }

    await agent.login({ identifier: handle, password: appPassword });
    return agent;
}

async function handleGetPost(request: any) {
    const { uri } = request;
    const client = await getAgent();
    return await getPost(uri, client);
}

async function handleEditPost(request: any) {
    const { originalUri, newText, newEmbed } = request;
    const client = await getAgent();
    await editPost(originalUri, newText, client, newEmbed);
}

async function handleUploadImage(message: any, sendResponse: (r: any) => void) {
    try {
        const agent = await getAgent();
        const { base64Data, encoding } = message;

        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const blob = await uploadBlob(bytes, encoding, agent);
        sendResponse({ success: true, blob });
    } catch (err: any) {
        console.error('[BlueSky Edit] handleUploadImage Error:', err);
        sendResponse({ success: false, error: err.message });
    }
}
