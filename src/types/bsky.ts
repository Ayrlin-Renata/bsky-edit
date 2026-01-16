export interface ViewImage {
    thumb: string;
    fullsize: string;
    alt: string;
    isCompressed?: boolean;
}

export interface ViewExternal {
    uri: string;
    title: string;
    description: string;
    thumb?: string;
}

export interface ViewRecord {
    uri: string;
    cid: string;
    author: {
        handle: string;
        displayName?: string;
        avatar?: string
    };
    value?: {
        text?: string
    };
    embeds?: any[];
}

export interface EmbedViewImages {
    $type: 'app.bsky.embed.images#view';
    images: ViewImage[];
}

export interface EmbedViewExternal {
    $type: 'app.bsky.embed.external#view';
    external: ViewExternal;
}

export interface EmbedViewRecord {
    $type: 'app.bsky.embed.record#view';
    record: ViewRecord | { $type: 'app.bsky.embed.record#viewNotFound' } | { $type: 'app.bsky.embed.record#viewBlocked' };
}

export interface EmbedViewRecordWithMedia {
    $type: 'app.bsky.embed.recordWithMedia#view';
    media: EmbedViewImages | EmbedViewExternal;
    record: { record: ViewRecord };
}

export type EmbedView = EmbedViewImages | EmbedViewExternal | EmbedViewRecord | EmbedViewRecordWithMedia;

export interface EmbedRecordData {
    $type: string;
    [key: string]: any;
}
