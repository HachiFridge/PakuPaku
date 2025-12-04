import { workspace } from 'vscode';
export const CONFIG_SECTION = "pakupaku";
export default () => workspace.getConfiguration(CONFIG_SECTION);