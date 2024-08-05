import { TFile } from "obsidian";
import * as fs from "node:fs";

type DataSource = {
	content: string;
	map: Map<string, any>;
};

export default class Metadata extends Map<string, any> {
	private readonly content: string;
	private readonly isInitialized: boolean;
	private readonly watcher: fs.FSWatcher;

	public async set(key: string, value: any): Promise<this> {
		if (this.get(key) !== value) {
			super.set(key.toString(), value);
			if (this.isInitialized) {
				await this.updateMetadata();
			}
		}
		return this;
	}
	public async delete(key: string): Promise<boolean> {
		const result = super.delete(key.toString());
		if (result && this.isInitialized) {
			await this.updateMetadata();
		}
		return result;
	}
	private async updateMetadata() {
		const updatedContent = `---\n${Array.from(this.entries())
			.map(([key, value]) => `${key}: ${value ? value : ""}`)
			.join("\n")}\n---`;
		await this.file.vault.modify(this.file, updatedContent + this.content);
	}
	private constructor(private readonly file: TFile, dataSource: DataSource) {
		super(dataSource.map);
		this.watcher = fs.watch(file.path, event => {
			console.log(event);
		});
		this.content = dataSource.content;
		for (const [key] of this.entries()) {
			Object.defineProperty(this, key, {
				set: async (value: any) => {
					await this.set(key, value);
				},
			});
		}
		this.isInitialized = true;
	}

	static async fromFile(file: TFile) {
		return new Metadata(file, await Metadata.getData(file));
	}
	private static findFirstNonWhiteSpaceIndex(str: string, startIndex: number = 0): number {
		for (let i = startIndex; i < str.length; i++) {
			if (str[i] !== " ") {
				return i;
			}
		}
		return -1;
	}
	private static async getData(file: TFile): Promise<DataSource> {
		const map = new Map<string, any>();
		let content = await file.vault.read(file);
		const match = content.match(/---\n([\s\S]*?)\n---/);
		if (match) {
			if (typeof (match.index) === "number" && match.index > -1)
				content = content.slice(match.index + match[0].length);
			const meta = match[1].split("\n");
			for (let i = 0; i < meta.length; i++) {
				const sepIndex = meta[i].indexOf(":");
				const key = sepIndex > -1 ? meta[i].substring(0, sepIndex) : "unknown";
				const valueStartIndex = Metadata.findFirstNonWhiteSpaceIndex(meta[i], sepIndex + 1);
				const value = valueStartIndex > -1 ? meta[i].substring(valueStartIndex) : null;
				if (!value && (i + 1) < meta.length) {
					const arrValue = [];
					let inc = i + 1;
					let arrIndex = Metadata.findFirstNonWhiteSpaceIndex(meta[inc]);
					while (arrIndex > -1 && meta[inc][arrIndex] === "-") {
						const ind = Metadata.findFirstNonWhiteSpaceIndex(meta[inc], arrIndex + 1);
						arrValue.push(meta[inc].slice(ind));
						inc++;
						if (inc === meta.length) {
							break;
						}
						arrIndex = Metadata.findFirstNonWhiteSpaceIndex(meta[inc]);
					}
					map.set(key, arrValue.length === 0 ? value : arrValue);
					if (arrValue.length !== 0) {
						i = inc - 1;
					}
				} else {
					map.set(key, value);
				}
			}
		}
		return { content, map };
	}
}
