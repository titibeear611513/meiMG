export const defaultAvatarDefinitions = [
    {
        id: 'pooh',
        filePath:
            '/Users/liuxiuwei/.cursor/projects/Users-liuxiuwei-Desktop-MeiMG/assets/Pooh_avatar-127544d1-27ef-4b06-9242-3dc664671b79.png',
    },
    {
        id: 'eeyore',
        filePath:
            '/Users/liuxiuwei/.cursor/projects/Users-liuxiuwei-Desktop-MeiMG/assets/Eeyore_avatar-22b1badd-04d0-4f14-8ea6-491ea5a9168b.png',
    },
    {
        id: 'piglet',
        filePath:
            '/Users/liuxiuwei/.cursor/projects/Users-liuxiuwei-Desktop-MeiMG/assets/Piglet_avatar-b903e0c8-5bc9-4880-8f7c-3985696359d8.png',
    },
    {
        id: 'tigger',
        filePath:
            '/Users/liuxiuwei/.cursor/projects/Users-liuxiuwei-Desktop-MeiMG/assets/Tigger_avatar-c0c2f84f-4183-48b4-a68a-0c3fbf8e2e83.png',
    },
    {
        id: 'hunny',
        filePath:
            '/Users/liuxiuwei/.cursor/projects/Users-liuxiuwei-Desktop-MeiMG/assets/Hunny_avatar-d9b6b5ca-d69a-4aa3-8e93-8b46ef6a5d3b.png',
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
