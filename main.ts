import { App, Plugin, TFile } from "obsidian";
import Metadata from "./src/metadata";

export interface PublicApi {
	getMetadataByPath(path: string): Promise<Metadata> | null;
	getMetadataByFile(file: TFile): Promise<Metadata> | null;
}

export class Api implements PublicApi {
	constructor(private app: App) {
	}

	getMetadataByPath(path: string): Promise<Metadata> | null {
		const file = this.app.vault.getFileByPath(path);
		return file ? this.getMetadataByFile(file) : null;
	}
	getMetadataByFile(file: TFile): Promise<Metadata> | null {
		return file ? Metadata.fromFile(file) : null;
	}

}

export default class MetaEditorPlugin extends Plugin {
	public api: PublicApi;

	public onload() {
		super.onload();
		this.api = new Api(this.app);
	}
}
