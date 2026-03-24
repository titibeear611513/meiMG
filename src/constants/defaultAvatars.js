export const defaultAvatarDefinitions = [
    {
        id: 'pooh',
        bg: '#f6e8b1',
        fg: '#7c5a5a',
        label: 'PO',
    },
    {
        id: 'eeyore',
        bg: '#bfd0f2',
        fg: '#6b5c7a',
        label: 'EE',
    },
    {
        id: 'piglet',
        bg: '#ffd1de',
        fg: '#7a4b5f',
        label: 'PI',
    },
    {
        id: 'tigger',
        bg: '#ffd59e',
        fg: '#7a5a3b',
        label: 'TI',
    },
    {
        id: 'hunny',
        bg: '#fff0a8',
        fg: '#7d583c',
        label: 'HU',
    },
];

export function getDefaultAvatarUrlById(id) {
    const hit = defaultAvatarDefinitions.find((item) => item.id === id);
    return hit ? `/api/users/default-avatars/${hit.id}` : null;
}

export function getRandomDefaultAvatarUrl() {
    const idx = Math.floor(Math.random() * defaultAvatarDefinitions.length);
    return `/api/users/default-avatars/${defaultAvatarDefinitions[idx].id}`;
}

export function getDefaultAvatarSvgById(id) {
    const hit = defaultAvatarDefinitions.find((item) => item.id === id);
    if (!hit) return null;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="${hit.id}">
<rect width="256" height="256" fill="${hit.bg}" rx="128" />
<circle cx="128" cy="108" r="54" fill="#fff7ef" />
<rect x="56" y="162" width="144" height="54" rx="27" fill="#fff7ef" />
<text x="128" y="145" text-anchor="middle" font-size="38" font-family="Arial, sans-serif" font-weight="700" fill="${hit.fg}">${hit.label}</text>
</svg>`;
}
