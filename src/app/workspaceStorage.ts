import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Directory, Paths } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';
import { WorkspaceRepository } from '../core/persistence';

const directory = () => new Directory(Paths.document, 'cocwidget-workspaces');
export const workspaceStorage = new WorkspaceRepository({
  get: key => AsyncStorage.getItem(key), set: (key, value) => AsyncStorage.setItem(key, value),
  remove: key => AsyncStorage.removeItem(key), identifier: randomUUID,
  read: async name => {
    const file = new File(directory(), name);
    if (!file.exists || file.size > 20_000_000) throw new Error('Workspace file is missing or exceeds 20 MB.');
    return file.text();
  },
  write: async (name, text) => {
    const folder = directory(); folder.create({ idempotent: true, intermediates: true });
    new File(folder, name).write(text);
  },
  unlink: async name => { const file = new File(directory(), name); if (file.exists) file.delete(); },
});
