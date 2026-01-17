import { createRoot } from 'react-dom/client';
import browser from 'webextension-polyfill';
import { EditModal } from './components/EditModal';

const modalContainer = document.createElement('div');
modalContainer.id = 'bsky-edit-modal-root';
document.body.appendChild(modalContainer);

let modalRoot: any = null;

function renderModal(props: any) {
    if (!modalRoot) {
        modalRoot = createRoot(modalContainer);
    }
    modalRoot.render(<EditModal {...props} />);
}

function closeModal() {
    if (modalRoot) {
        modalRoot.render(null);
    }
}

let lastInteractedPostUri: string | null = null;

document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const trigger = target.closest('button[aria-label="More options"], [data-testid="postDropdownBtn"], [aria-label="Post menu"]');

    if (trigger) {
        const postContainer = trigger.closest('[data-uri]');
        if (postContainer) {
            lastInteractedPostUri = postContainer.getAttribute('data-uri');
            console.log('BlueSky Edit: Captured URI (data-uri)', lastInteractedPostUri);
        } else {
            const feedItem = trigger.closest('[data-testid^="feedItem-"]');
            if (feedItem) {
                const timestampLink = feedItem.querySelector('a[href*="/post/"][data-tooltip]');
                if (timestampLink) {
                    lastInteractedPostUri = (timestampLink as HTMLAnchorElement).href;
                    console.log('BlueSky Edit: Captured URI (timestamp)', lastInteractedPostUri);
                } else {
                    const anyPostLink = feedItem.querySelector('a[href*="/post/"]');
                    if (anyPostLink) {
                        lastInteractedPostUri = (anyPostLink as HTMLAnchorElement).href;
                        console.log('BlueSky Edit: Captured URI (fallback link)', lastInteractedPostUri);
                    } else {
                        lastInteractedPostUri = null;
                    }
                }
            } else {
                lastInteractedPostUri = null;
            }
        }
    }
}, true);

let mutationQueue: Node[] = [];
let isProcessingMutations = false;

const processMutationQueue = () => {
    const nodes = [...mutationQueue];
    mutationQueue = [];
    isProcessingMutations = false;

    for (const node of nodes) {
        if (node.nodeType === 1) {
            const el = node as HTMLElement;
            if (el.childNodes.length < 15) {
                checkForMenu(el);
            }
        }
    }
};

const observer = new MutationObserver((mutations) => {
    let hasAddedNodes = false;
    for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach((node) => {
                mutationQueue.push(node);
            });
            hasAddedNodes = true;
        }
    }

    if (hasAddedNodes && !isProcessingMutations) {
        isProcessingMutations = true;
        setTimeout(processMutationQueue, 50);
    }
});

observer.observe(document.body, { childList: true, subtree: true });

function checkForMenu(node: HTMLElement) {
    const isMenu = node.getAttribute && node.getAttribute('role') === 'menu';
    const hasDelete = node.querySelector ? node.querySelector('[data-testid="postDropdownDeleteBtn"]') : null;

    if (isMenu || hasDelete) {
        const targetBtn = (hasDelete as HTMLElement) || (node.getAttribute('data-testid') === 'postDropdownDeleteBtn' ? node : null);
        if (targetBtn) {
            const menuContainer = targetBtn.parentElement;
            if (menuContainer) {
                injectEditButton(menuContainer as HTMLElement, targetBtn as HTMLElement);
            }
        }
    }
}

function injectEditButton(menuNode: HTMLElement, deleteBtn: HTMLElement) {
    if (menuNode.querySelector('.bsky-edit-btn')) return;

    const deleteBtnTextEl = deleteBtn.querySelector('div[dir="auto"]') || deleteBtn.querySelector('div');
    const computedStyle = window.getComputedStyle(deleteBtnTextEl || deleteBtn);

    const textColor = computedStyle.color || 'rgb(226, 231, 238)';
    const fontSize = computedStyle.fontSize || '13.1px';
    const fontWeight = computedStyle.fontWeight || '600';
    const fontFamily = computedStyle.fontFamily || 'system-ui, -apple-system, sans-serif';
    const letterSpacing = computedStyle.letterSpacing || '0px';
    const lineHeight = computedStyle.lineHeight || 'normal';

    let isDarkMode = false;
    const rgb = textColor.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
        const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
        isDarkMode = brightness > 128;
    }

    const btn = document.createElement('div');
    btn.className = 'bsky-edit-btn';
    btn.setAttribute('role', 'menuitem');
    btn.setAttribute('tabindex', '0');

    btn.style.cssText = `
        display: flex; 
        flex-direction: row; 
        align-items: center; 
        gap: 16px; 
        padding: 8px 10px; 
        cursor: pointer; 
        outline: none;
        box-sizing: border-box;
        min-height: 32px;
        border-radius: 4px;
        transition: background-color 0.1s;
        color: ${textColor};
    `;

    const hoverBg = isDarkMode ? 'rgb(34, 46, 63)' : 'rgba(0,0,0,0.05)';

    btn.onmouseenter = () => { btn.style.backgroundColor = hoverBg; };
    btn.onmouseleave = () => { btn.style.backgroundColor = 'transparent'; };

    const iconDiv = document.createElement('div');
    iconDiv.style.cssText = 'display: flex; align-items: center; justify-content: center;';
    iconDiv.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" style="color: inherit; fill: currentColor;">
            <path fill="currentColor" stroke="none" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
    `;

    const textDiv = document.createElement('div');
    textDiv.innerText = 'Edit Post';
    textDiv.style.cssText = `
        flex: 1 1 0%; 
        font-family: ${fontFamily}; 
        font-size: ${fontSize}; 
        font-weight: ${fontWeight}; 
        letter-spacing: ${letterSpacing};
        line-height: ${lineHeight};
        color: inherit;
        font-variant: no-contextual;
    `;

    btn.appendChild(textDiv);
    btn.appendChild(iconDiv);

    btn.onclick = (e) => {
        e.stopPropagation();

        if (!isContextValid()) {
            showToast('BlueSky Edit Extension updated. Please refresh the page to continue.', 'error');
            return;
        }

        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            keyCode: 27,
            which: 27,
            bubbles: true,
            cancelable: true
        }));

        let uri = lastInteractedPostUri;

        if (!uri) {
            if (window.location.href.includes('/post/')) {
                uri = window.location.href;
            }
        }

        if (!uri) {
            showToast('Could not determine post URI. Please try opening the post in Detail View.', 'error');
            return;
        }

        handleEditClick(uri);
    };

    menuNode.insertBefore(btn, deleteBtn);
}


function showToast(message: string, type: 'success' | 'error' = 'success') {
    let container = document.getElementById('bsky-edit-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'bsky-edit-toast-container';
        container.style.cssText = 'position: fixed; bottom: 20px; left: 20px; z-index: 999999; display: flex; flex-direction: column; gap: 8px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const icon = type === 'success' ?
        `<svg fill="none" viewBox="0 0 24 24" width="20" height="20"><path fill="#FFFFFF" stroke="none" stroke-width="0" stroke-linecap="butt" stroke-linejoin="miter" fill-rule="evenodd" clip-rule="evenodd" d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm13.633-3.274a1 1 0 0 1 .141 1.407l-4.5 5.5a1 1 0 0 1-1.481.074l-2-2a1 1 0 1 1 1.414-1.414l1.219 1.219 3.8-4.645a1 1 0 0 1 1.407-.141Z"></path></svg>` :
        `<svg fill="none" viewBox="0 0 24 24" width="20" height="20"><path fill="#FF4444" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;

    const bgColor = type === 'success' ? 'rgb(28, 39, 54)' : 'rgb(54, 28, 28)';
    const borderColor = type === 'success' ? 'rgb(44, 58, 78)' : 'rgb(78, 44, 44)';

    toast.innerHTML = `
        <div style="flex: 1 1 0%; padding: 14px 16px; border-radius: 12px; border-width: 1px; border-style: solid; display: flex; flex-direction: row; gap: 8px; box-shadow: rgba(0, 0, 0, 0.4) 0px 4px 6px -1px, rgba(0, 0, 0, 0.4) 0px 2px 4px -2px, rgb(0, 0, 0) 0px 0px 0px; background-color: ${bgColor}; border-color: ${borderColor}; align-items: center;">
            ${icon}
            <div style="flex: 1 1 0%; padding-right: 16px;">
                <div dir="auto" style="font-size: 15px; letter-spacing: 0px; color: rgb(255, 255, 255); font-weight: 500; line-height: 20px; pointer-events: none; font-variant: no-contextual;">${message}</div>
            </div>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = 'opacity 0.5s ease-out';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function isContextValid() {
    return !!(browser.runtime && browser.runtime.id);
}

async function fetchPostDetails(urlOrUri: string) {
    try {
        const response = (await browser.runtime.sendMessage({ type: 'GET_POST', uri: urlOrUri })) as any;
        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.error("Failed to fetch post:", response?.error);
            // Fallback for current page or matched element
            if (urlOrUri.startsWith('at://')) {
                const postEl = document.querySelector(`[data-uri="${urlOrUri}"]`);
                if (postEl) {
                    const contentEl = postEl.querySelector('[data-testid="post-content"]');
                    if (contentEl) return { text: contentEl.textContent || "" };
                }
            }
        }
    } catch (err: any) {
        console.error('[BlueSky Edit] sendMessage Error:', err);
    }
    return null;
}

async function handleEditClick(urlOrUri: string) {
    if (!isContextValid()) {
        showToast('BlueSky Edit Extension updated. Please refresh the page to continue.', 'error');
        return;
    }

    const result = await browser.storage.local.get(['appPassword', 'handle']);
    const isAuthMissing = !result.appPassword || !result.handle;

    let postData = null;
    if (!isAuthMissing) {
        postData = await fetchPostDetails(urlOrUri);
    }

    const props = {
        originalText: postData?.text || "",
        originalEmbed: postData?.embedView,
        originalEmbedRecord: postData?.embedRecord,
        isAuthMissing: isAuthMissing,
        onClose: closeModal,
        onAuthSave: async (creds: { handle: string, appPassword: string }) => {
            await browser.storage.local.set(creds);
            // After saving auth, try to fetch the post
            const newData = await fetchPostDetails(urlOrUri);
            return newData;
        },
        onSave: async (newText: string, newEmbed?: any) => {
            try {
                const editResponse = (await browser.runtime.sendMessage({
                    type: 'EDIT_POST',
                    originalUri: urlOrUri,
                    newText,
                    newEmbed
                })) as any;

                if (editResponse && editResponse.success) {
                    console.log('[BlueSky Edit] Edit Success:', editResponse);
                    showToast('Post updated successfully!', 'success');
                } else {
                    console.error('[BlueSky Edit] Edit Failed:', editResponse);
                    showToast('Error: ' + (editResponse?.error || 'Unknown error'), 'error');
                }
            } catch (err: any) {
                console.error('[BlueSky Edit] Edit sendMessage Error:', err);
                showToast('Connection failed. Post could not be edited.', 'error');
            }
        }
    };
    renderModal(props);
}
