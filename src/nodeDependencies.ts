import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class DepNodeProvider implements vscode.TreeDataProvider<Dependency> {

	private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined | void> = new vscode.EventEmitter<Dependency | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<Dependency | undefined | void> = this._onDidChangeTreeData.event;

	private filterData: any[] = [];

	constructor(private workspaceRoot: string | undefined) {
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: Dependency): vscode.TreeItem {
		const { description, label, tooltip, collapsibleState } = element;
		return {
			label: label,
			// collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
			collapsibleState,
			description,
			tooltip
		};
	}

	getChildren(element?: Dependency): Thenable<Dependency[]> {
		if (this.workspaceRoot) {
			if (element) {
				// 文件展开逻辑
				return Promise.resolve(this.getElementChildren(element));
			}

			// 第一次遍历文件逻辑			
			const packageJsonPath = path.join(this.workspaceRoot, 'superFilter.json');
			if (this.pathExists(packageJsonPath)) {
				return Promise.resolve(this.getDepsInPackageJson(packageJsonPath));
			} else {
				vscode.window.showInformationMessage('Workspace has no superFilter.json');
				return Promise.resolve([]);
			}
		}

		vscode.window.showInformationMessage('No dependency in empty workspace');

		const mockArr0 = new Dependency('label0', 'version0', vscode.TreeItemCollapsibleState.None);
		const mockArr1 = new Dependency('label1', 'version1', vscode.TreeItemCollapsibleState.Collapsed);
		return Promise.resolve([mockArr0, mockArr1]);

	}

	/**
	 * Given the path to package.json, read all its dependencies and devDependencies.
	 */
	private getDepsInPackageJson(packageJsonPath: string): Dependency[] {
		const workspaceRoot = this.workspaceRoot;
		if (this.pathExists(packageJsonPath) && workspaceRoot) {
			this.filterData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

			const deps = this.filterData?.map((item: any) => {
				const { filePath, messages } = item;
				// workspaceRoot 
				const root = workspaceRoot.split('/').slice(-1)[0];
				const fileSplitArr = filePath.split(root);

				const moduleName = fileSplitArr?.[1] ?? fileSplitArr?.[0];

				const pathFileArr = moduleName.split('/');
				const fileName = pathFileArr.splice(-1)[0];
				const pathName = pathFileArr.join('/');

				return new Dependency(fileName, pathName, vscode.TreeItemCollapsibleState.Collapsed, {
					command: 'extension.openPackageOnNpm',
					title: '',
				});
			});

			return deps;
		} else {
			const mockArr0 = new Dependency('getDepsInPackageJson', 'version0', vscode.TreeItemCollapsibleState.None);
			const mockArr1 = new Dependency('nothing', 'version1', vscode.TreeItemCollapsibleState.Collapsed);
			return [mockArr0, mockArr1];
		}
	}

	private getElementChildren(element: Dependency): Dependency[] {
		const { label, description: path } = element;
		const record = this.filterData?.find((item: any) => item.filePath === `${path}/${label}`);
		const messages = record?.messages ?? [];

		return messages.map((item: any) => {
			// item.message是字符串： "'year' is defined but never used."
			// 用 is 截取， 处理后返回 year
			const { message, line, column, endColumn } = item;
			const word = message.split(' is ')[0].replace(/'/g, '');
			const desc = `line: ${line}, ${column}-${endColumn}`;
			return new Dependency(word, desc, vscode.TreeItemCollapsibleState.None);
		});
	}

	private pathExists(p: string): boolean {
		try {
			fs.accessSync(p);
		} catch (err) {
			return false;
		}

		return true;
	}
}

export class Dependency extends vscode.TreeItem {

	constructor(
		public readonly label: string,
		private readonly version: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
		super(label, collapsibleState);

		this.tooltip = `${this.label}-${this.version}`;
		this.description = this.version;
	}

	iconPath = {
		light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
		dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
	};

	contextValue = 'dependency';
}