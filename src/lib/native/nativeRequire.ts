//for use in node-sea executables using the rom file struct

import { randomUUID } from "crypto";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { rom } from "../../main";
import { createRequire } from "module";

//define temporary path
const TMP = join(tmpdir(), `node-native-${randomUUID()}`);
const MODULES = join(TMP, "node_modules");


//allow requiring native
export function requireNative(lib:string): NodeRequire {
    if(!existsSync(TMP)) {
        unpackNativeModules();
    }
    
    let modulePath = join(MODULES, lib);
    if(!existsSync(modulePath)) {
        throw `Module ${lib} not present in bundled native libraries ${MODULES}`;
    }

    let req = createRequire(modulePath);
    return req(JSON.parse(readFileSync(join(modulePath, "package.json")).toString()).name);
}


//unpack natives into temporary directory
export function unpackNativeModules() {
    if(!existsSync(TMP)) {
        mkdirSync(TMP);
        rom.copyDirectorySync(".native", TMP);
    }
}