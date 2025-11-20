import { openDB, type IDBPDatabase } from 'idb';

export interface IPersistence {
    saveChunk(x: number, z: number, data: Uint8Array): Promise<void>;
    loadChunk(x: number, z: number): Promise<Uint8Array | null>;
}

export class IDBPersistence implements IPersistence {
    dbPromise: Promise<IDBPDatabase>;

    constructor() {
        this.dbPromise = openDB('minimine-db', 1, {
            upgrade(db) {
                db.createObjectStore('chunks');
            },
        });
    }

    async saveChunk(x: number, z: number, data: Uint8Array): Promise<void> {
        const db = await this.dbPromise;
        await db.put('chunks', data, `${x},${z}`);
    }

    async loadChunk(x: number, z: number): Promise<Uint8Array | null> {
        const db = await this.dbPromise;
        return (await db.get('chunks', `${x},${z}`)) || null;
    }
}
