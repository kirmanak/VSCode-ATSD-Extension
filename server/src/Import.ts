import * as request from "request";

export default class Import {
    private name: string;
    private url: string;
    private content: string = undefined;

    constructor(name: string, url: string) {
        this.name = name;
        this.url = url;
    }

    public async getContent(): Promise<string> {
        if (this.content) { return this.content; }
        return new Promise<string>((resolve, reject) => {
            request(this.getUrl(), (error, response, body) => {
                if (error) { return reject(error); }
                if (response.statusCode !== 200) { return reject(response.statusCode); }
                this.content = body;
                return resolve(body);
            });
        });
    }

    public getName(): string { return this.name; }
    public setName(name: string) { this.name = name; }

    public getUrl(): string { return this.url; }
}
