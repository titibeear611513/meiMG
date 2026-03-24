const bucket = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION;
const baseFromEnv = process.env.DEFAULT_AVATAR_BASE_URL?.replace(/\/$/, '');
const inferredBase =
    bucket && region
        ? `https://${bucket}.s3.${region}.amazonaws.com/default-avatars`
        : null;

const avatarBaseUrl = baseFromEnv || inferredBase;

export const defaultAvatarDefinitions = [
    { id: 'pooh', key: 'pooh.jpg' },
    { id: 'eeyore', key: 'eeyore.jpg' },
    { id: 'piglet', key: 'piglet.jpg' },
    { id: 'tigger', key: 'tigger.jpg' },
    { id: 'hunny', key: 'hunny.jpg' },
];

export function getDefaultAvatarUrlById(id) {
    const hit = defaultAvatarDefinitions.find((item) => item.id === id);
    if (!hit || !avatarBaseUrl) return null;
    return `${avatarBaseUrl}/${hit.key}`;
}

export function getRandomDefaultAvatarUrl() {
    const idx = Math.floor(Math.random() * defaultAvatarDefinitions.length);
    if (!avatarBaseUrl) return null;
    return `${avatarBaseUrl}/${defaultAvatarDefinitions[idx].key}`;
}
