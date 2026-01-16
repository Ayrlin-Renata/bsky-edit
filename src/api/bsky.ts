import { BskyAgent, RichText } from '@atproto/api';

function extractPostDetails(uri: string) {
    let handleOrDid = '';
    let rkey = '';

    console.log(`[BlueSky Edit] Extracting details from: ${uri}`);

    if (uri.startsWith('http')) {
        const parts = uri.split('/');
        const postIndex = parts.indexOf('post');
        if (postIndex !== -1 && postIndex > 0 && postIndex < parts.length - 1) {
            handleOrDid = parts[postIndex - 1];
            rkey = parts[postIndex + 1];
        }
    } else if (uri.startsWith('at://')) {
        const parts = uri.replace('at://', '').split('/');
        if (parts.length >= 3) {
            handleOrDid = parts[0];
            rkey = parts[2];
        }
    }

    if (rkey) {
        rkey = rkey.split(/[?#]/)[0];
    }

    console.log(`[BlueSky Edit] Extracted - Handle/DID: ${handleOrDid}, RKey: ${rkey}`);
    return { handleOrDid, rkey };
}

export async function getPost(uri: string, agent: BskyAgent) {
    console.log(`[BlueSky Edit] getPost called for: ${uri}`);
    try {
        const { handleOrDid, rkey } = extractPostDetails(uri);
        let atUri = uri;

        if (!rkey) {
            throw new Error(`Could not parse RKey from URI: ${uri}`);
        }

        if (uri.startsWith('http')) {
            if (handleOrDid.startsWith('did:')) {
                atUri = `at://${handleOrDid}/app.bsky.feed.post/${rkey}`;
            } else {
                console.log(`[BlueSky Edit] Resolving handle: ${handleOrDid}`);
                const { data } = await agent.resolveHandle({ handle: handleOrDid });
                atUri = `at://${data.did}/app.bsky.feed.post/${rkey}`;
            }
        }

        console.log(`[BlueSky Edit] Fetching thread for AT-URI: ${atUri}`);
        const { data: thread } = await agent.api.app.bsky.feed.getPostThread({ uri: atUri });

        if (!thread.thread) {
            throw new Error('Could not find post');
        }

        // @ts-ignore
        const post = thread.thread.post;
        if (!post) throw new Error('Post not found in thread');

        const record = post.record as any;

        return {
            text: record.text,
            cid: post.cid,
            embedView: post.embed,
            embedRecord: record.embed
        };
    } catch (err) {
        console.error('[BlueSky Edit] getPost Error:', err);
        throw err;
    }
}

export async function editPost(originalUri: string, newText: string, agent: BskyAgent, newEmbed?: any) {
    console.log(`[BlueSky Edit] editPost (Skeets Style) called for: ${originalUri}`);
    try {
        const { rkey } = extractPostDetails(originalUri);

        if (!rkey || !agent.session?.did) {
            throw new Error('Invalid URI or not logged in');
        }

        const repo = agent.session.did;
        const collection = 'app.bsky.feed.post';
        const atUri = `at://${repo}/${collection}/${rkey}`;

        console.log(`[BlueSky Edit] Editing post ${rkey} in repo ${repo}`);
        console.log(`[BlueSky Edit] Constructed URI: ${atUri}`);

        const { data: originalPost } = await agent.api.app.bsky.feed.getPostThread({ uri: atUri });

        if (!originalPost.thread) {
            throw new Error('Post not found');
        }

        // @ts-ignore
        const oldRecord = originalPost.thread.post.record;

        const rt = new RichText({ text: newText });
        await rt.detectFacets(agent);

        const markdownRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        const markdownFacets: any[] = [];
        let cleanText = newText;
        let offsetShift = 0;

        while ((match = markdownRegex.exec(newText)) !== null) {
            const [full, title, url] = match;
            const startIdx = match.index - offsetShift;

            cleanText = cleanText.substring(0, startIdx) + title + cleanText.substring(startIdx + full.length);
            offsetShift += (full.length - title.length);

            const endIdx = startIdx + title.length;

            const textBefore = cleanText.substring(0, startIdx);
            const textWithTitle = cleanText.substring(0, endIdx);
            const byteStart = new TextEncoder().encode(textBefore).length;
            const byteEnd = new TextEncoder().encode(textWithTitle).length;

            markdownFacets.push({
                index: { byteStart, byteEnd },
                features: [{ $type: 'app.bsky.richtext.facet#link', uri: url }]
            });
        }

        const finalRt = new RichText({ text: cleanText });
        await finalRt.detectFacets(agent);

        finalRt.facets = [...(finalRt.facets || []), ...markdownFacets];
        finalRt.facets.sort((a, b) => a.index.byteStart - b.index.byteStart);

        const newRecord = {
            ...oldRecord,
            text: finalRt.text,
            facets: finalRt.facets,
            embed: newEmbed === undefined ? oldRecord.embed : (newEmbed === null ? undefined : newEmbed),
            createdAt: new Date().toISOString(),
        };

        console.log('[BlueSky Edit] Performing Atomic Swap (applyWrites)...');

        await agent.api.com.atproto.repo.applyWrites({
            repo: repo,
            writes: [
                {
                    $type: 'com.atproto.repo.applyWrites#delete',
                    collection: collection,
                    rkey: rkey,
                },
                {
                    $type: 'com.atproto.repo.applyWrites#create',
                    collection: collection,
                    rkey: rkey,
                    value: newRecord,
                },
            ],
        });

        console.log('[BlueSky Edit] Post swapped successfully!');
    } catch (err) {
        console.error('[BlueSky Edit] editPost Error:', err);
        throw err;
    }
}

export async function uploadBlob(blob: Blob | Uint8Array, encoding: string, agent: BskyAgent) {
    console.log(`[BlueSky Edit] uploadBlob called, encoding: ${encoding}`);
    try {
        const { data } = await agent.api.com.atproto.repo.uploadBlob(blob, {
            encoding,
        });
        console.log('[BlueSky Edit] Blob uploaded successfully:', data.blob);
        return data.blob;
    } catch (err) {
        console.error('[BlueSky Edit] uploadBlob Error:', err);
        throw err;
    }
}
