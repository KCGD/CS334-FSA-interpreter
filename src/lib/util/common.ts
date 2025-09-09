import { Log } from "./debug";

export function failwith(message:any, code?:number): never {
    Log(`E`, message);
    process.exit(code ?? 1);
}