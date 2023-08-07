import tinyupdater from 'tiny-updater';
import { name, version } from '../../package.json';

export const updater = async (_ctx) => {
    await tinyupdater({ name, version, ttl: 86_400_000 });
};
