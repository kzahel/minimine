import { IDBPersistence } from './Persistence';
import { WorldWorkerController } from './WorldWorkerController';

const persistence = new IDBPersistence();
const controller = new WorldWorkerController(persistence, (msg, transfer) => {
    self.postMessage(msg, transfer as any);
});

self.onmessage = (e) => {
    controller.handleMessage(e.data);
};

