import * as vscode from 'vscode';
import { MDB_TABLE_NAMES } from '../sqlite';

export default class MdbTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    static register(_context: vscode.ExtensionContext): vscode.Disposable {
        return vscode.window.createTreeView('mdb', {
            treeDataProvider: new MdbTreeDataProvider
        });
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(_element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
        return MDB_TABLE_NAMES.map(name => {
            return {
                id: name,
                label: name,
                command: {
                    title: "PakuPaku: Open MDB editor",
                    command: "pakupaku.openMdbEditor",
                    arguments: [name]
                }
            };
        });
    }
}