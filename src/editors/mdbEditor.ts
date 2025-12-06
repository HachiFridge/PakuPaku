import * as vscode from 'vscode';
import { getEditorHtml, makeEditForStringProperty } from './utils';
import { ControllerMessage, EditorMessage, IEntryTreeNode, ITreeNode, TreeNodeId } from './sharedTypes';
import { JsonDocument, utils } from '../core';
import textDataCategories from './mdbTextDataCategories';
import SQLite, { MDB_TABLE_COLUMNS, MDB_TABLE_NAMES, MdbTableName } from '../sqlite';
import fontHelper from './fontHelper';
import { EditorBase } from './editorBase';
import { whenReady } from '../extensionContext';

const TABLE_CATEGORIZERS: { [K in MdbTableName]?: (column: string) => Promise<string> | string } = {
    text_data: category => `${category} ${textDataCategories[category] ?? ''}`,
    character_system_text: async (characterId) => {
        const characterNames = await utils.getTextDataCategoryCached(6);
        return characterNames[+characterId] ?? characterId;
    },
};

const TEXT_DATA_CHARACTER_CATEGORIES = new Set([7, 8, 9, 144, 157, 158, 162, 163, 164, 165, 166, 167, 168, 169]);
const TABLE_ENTRY_NAME_GETTERS: {
    [K in MdbTableName]?: (categoryColumn: string | null, idColumn: string) => Promise<string | void> | string | void
} = {
    text_data: async (category, index) => {
        // ???
        if (!category) { return; }

        if (TEXT_DATA_CHARACTER_CATEGORIES.has(+category)) {
            const characterNames = await utils.getTextDataCategoryCached(6);
            return `${index} ${characterNames[+index] ?? ''}`;
        }
    },
};

export class MdbEditorProvider extends EditorBase implements vscode.CustomTextEditorProvider {
    static readonly viewType = 'pakupaku.mdbEditor';

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new MdbEditorProvider(context);
        return vscode.window.registerCustomEditorProvider(MdbEditorProvider.viewType, provider);
    }

    resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken) {
        const tableName = this.getTableName(document.uri);

        // Json document setup
        const json = new JsonDocument<{ [key: string]: string | { [key: string]: string } } | null>(document.uri, null, () => {
            const content = getDictValue(this.subscribedPath);
            postMessage({
                type: 'setTextSlotContent',
                entryPath: this.subscribedPath,
                index: 0,
                content,
            });
            postMessage({
                type: 'setExists',
                path: this.subscribedPath,
                exists: content !== null,
            });
        });
        this.disposables.push(json);

        const initReadPromise = json.readTextDocument().catch((_) => {});
        json.watchTextDocument(document);
        function getDictProperty(path: TreeNodeId[]): jsonToAst.PropertyNode | undefined {
            if (json.ast.type !== 'Object' || !path.length) { return; }
            let currentObject = json.ast;
            for (let i = 0; i < path.length - 1; ++i) {
                const id = path[i];
                const valueNode = json.astObjectsProps.get(currentObject)?.[id]?.value;
                if (valueNode?.type !== 'Object') { return; }
                currentObject = valueNode;
            }

            return json.astObjectsProps.get(currentObject)?.[path.at(-1)!];
        }
        function getDictValue(path: TreeNodeId[]): string | null {
            const valueNode = getDictProperty(path)?.value;
            return (!valueNode || valueNode.type !== 'Literal' || typeof valueNode.value !== 'string')
                ? null
                : valueNode.value;
        }

        // Init webview
        this.setupWebview(webviewPanel);

        // Messaging setup
        function postMessage(message: ControllerMessage) {
            webviewPanel.webview.postMessage(message);
        }

        let prevEditPromise = Promise.resolve();
        const dataPromise = MdbEditorProvider.generateData(tableName);
        webviewPanel.webview.onDidReceiveMessage(async (message: EditorMessage) => {
            let data: InitData;
            try {
                data = await dataPromise;
            }
            catch (e) {
                return vscode.window.showErrorMessage('' + e);
            }
            switch (message.type) {
                case 'init':
                    postMessage({ type: 'setExplorerTitle', title: tableName });
                    // Just making sure to prevent data races
                    initReadPromise.finally(() => {
                        postMessage({ type: 'setNodes', nodes: data.nodes });
                    });
                    fontHelper.onInit(webviewPanel.webview);
                    break;

                case 'getTextSlotContent':
                    postMessage({
                        type: 'setTextSlotContent',
                        entryPath: message.entryPath,
                        index: message.index,
                        content: getDictValue(message.entryPath),
                    });
                    break;

                case 'getExists':
                    postMessage({
                        type: 'setExists',
                        path: message.path,
                        exists: getDictValue(message.path) !== null,
                    });
                    break;

                case 'setTextSlotContent':
                    // Wait for previous edit to finish before applying another
                    prevEditPromise = prevEditPromise.then(async () => {
                        const path = message.entryPath as string[];
                        const content = message.content;

                        if (json.ast.type !== 'Object') { return; }
                        const rootProps = json.astObjectsProps.get(json.ast)!;
                        // Read current root object into JS
                        const rootMap: Record<string, any> = {};
                        for (const k of Object.keys(rootProps)) {
                            const v = rootProps[k]?.value;
                            if (v) { rootMap[k] = JsonDocument.getValue(v as any); }
                        }

                        if (path.length === 1) {
                            if (content === null) { delete rootMap[path[0]]; }
                            else { rootMap[path[0]] = content; }
                        }
                        else if (path.length === 2) {
                            const cat = (rootMap[path[0]] && typeof rootMap[path[0]] === 'object') ? { ...(rootMap[path[0]] as Record<string, string>) } : {};
                            if (content === null) {
                                delete cat[path[1]];
                                if (Object.keys(cat).length === 0) { delete rootMap[path[0]]; }
                                else { rootMap[path[0]] = cat; }
                            }
                            else {
                                cat[path[1]] = content;
                                rootMap[path[0]] = cat;
                            }
                            // sort nested category keys
                            if (rootMap[path[0]]) {
                                const sortedCat = Object.keys(rootMap[path[0]])
                                    .sort((a, b) => { const na = +a, nb = +b; const an = !isNaN(na), bn = !isNaN(nb); if (an && bn) { return na - nb; } if (an) { return -1; } if (bn) { return 1; } return a.localeCompare(b); })
                                    .reduce((o, k) => (o[k] = rootMap[path[0]][k], o), {} as Record<string, any>);
                                rootMap[path[0]] = sortedCat;
                            }
                        }
                        else {
                            return;
                        }

                        // sort root keys
                        const sortedRoot = Object.keys(rootMap)
                            .sort((a, b) => { const na = +a, nb = +b; const an = !isNaN(na), bn = !isNaN(nb); if (an && bn) { return na - nb; } if (an) { return -1; } if (bn) { return 1; } return a.localeCompare(b); })
                            .reduce((o, k) => (o[k] = rootMap[k], o), {} as Record<string, any>);

                        try {
                            const applied = await json.applyEdit({ type: 'object', action: 'set', values: sortedRoot });
                            if (!applied) {
                                vscode.window.showErrorMessage('Failed to apply edit');
                            }
                        }
                        catch (e) {
                            vscode.window.showErrorMessage('' + e);
                        }
                    });
                    break;

                case 'getCategoryFull':
                    if (data.categoryMap) {
                        if (json.ast.type !== 'Object') { break; }

                        const categoryId = message.path[0];
                        const category = data.categoryMap[categoryId];
                        if (!category) { break; }

                        const categoryProp = json.astObjectsProps.get(json.ast)?.[categoryId];
                        if (categoryProp?.value.type !== 'Object') { break; }

                        const tlCategory = categoryProp.value;
                        const tlIdSet = new Set(tlCategory.children.map(c => c.key.value));
                        let full = true;

                        for (const entry of category) {
                            if (!tlIdSet.has(entry.id as string)) {
                                full = false;
                                break;
                            }
                        }

                        postMessage({
                            type: 'setCategoryFull',
                            path: message.path,
                            full,
                        });
                    }
                    break;
            }
        });
    }

    static nextTableName: MdbTableName | undefined;

    private getTableName(uri: vscode.Uri): MdbTableName {
        let tableName = MdbEditorProvider.nextTableName;
        if (tableName) {
            MdbEditorProvider.nextTableName = undefined;
            return tableName;
        }
        else {
            // dumb table name inference
            const pathSplit = uri.path.split('/');
            const filename = pathSplit.at(pathSplit.length - 1);
            if (!filename) {
                tableName = undefined;
            }
            else {
                for (const name of MDB_TABLE_NAMES) {
                    if (filename.includes(name)) {
                        tableName = name;
                        break;
                    }
                }
            }
        }

        if (tableName) {
            /*
            vscode.window.showWarningMessage(
                `MDB Editor was launched externally, the table name has been inferred from the filename: ${tableName}`
            );
            */
            return tableName;
        }
        else {
            throw new Error('MDB Editor was launched externally, failed to infer table name from filename');
        }
    }

    static async generateData(tableName: MdbTableName): Promise<InitData> {
        await whenReady;

        const columns = MDB_TABLE_COLUMNS[tableName];
        const rows = await SQLite.instance.loadMdbTable(tableName);

        const nodes: ITreeNode[] = [];
        let categoryMap: { [key: string]: IEntryTreeNode[] } | undefined;
        const nameGetter = TABLE_ENTRY_NAME_GETTERS[tableName];
        if (columns.length === 3) {
            const categorizer = TABLE_CATEGORIZERS[tableName];
            categoryMap = {};
            for (const [categoryId, id, text] of rows) {
                let categoryChildren = categoryMap[categoryId];

                let prev: TreeNodeId | undefined;
                if (!categoryChildren) {
                    categoryChildren = [];
                    nodes.push({
                        type: 'category',
                        id: categoryId,
                        name: await categorizer?.(categoryId) ?? categoryId,
                        children: categoryChildren,
                    });
                    categoryMap[categoryId] = categoryChildren;
                }
                else {
                    const prevNode = categoryChildren[categoryChildren.length - 1];
                    prevNode.next = id;
                    prev = prevNode.id;
                }

                categoryChildren.push({
                    type: 'entry',
                    id,
                    name: await nameGetter?.(categoryId, id) ?? text,
                    content: [{
                        content: text,
                        multiline: true,
                    }],
                    prev,
                });
            }
        }
        else {
            for (const [id, text] of rows) {
                const prevNode = nodes[nodes.length - 1] as IEntryTreeNode;
                if (prevNode) {
                    prevNode.next = id;
                }

                nodes.push({
                    type: 'entry',
                    id,
                    name: await nameGetter?.(null, id) ?? text,
                    content: [{
                        content: text,
                        multiline: true,
                    }],
                    prev: prevNode?.id,
                });
            }
        }

        return { nodes, categoryMap };
    }

    protected override getHtmlForWebview(webview: vscode.Webview): string {
        return getEditorHtml(this.context.extensionUri, webview, 'commonEditor', 'Lyrics Editor');
    }
}

interface InitData {
    nodes: ITreeNode[];
    categoryMap?: { [key: string]: IEntryTreeNode[] };
}
