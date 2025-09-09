import { createReadStream, existsSync } from "fs";
import { createInterface } from "readline";

export type Program = {
    lang: Array<string>;
    accept: Array<string>;
    start: string;
    states: {[key:string]: Array<string>};
    vars: {[ley:string]: any};
}

export type ParserState = "General" | "State";

/**
 * rules:
 * "=" means assignment
 *  "[" means start array, "]" means end
 * ":" means definition of state (iff followed by nothing after the ':')
 *  state definition terminates when next state defined OR EOF reached
 */

export async function parse(file:string): Program {
    let proto:Program = {} as Program;
    let state:ParserState = "General";
    let state_name:string = "";
    
    // make sure file exists
    if(!existsSync(file)) {
        throw new Error(`File "${file}" not found`);
    }

    // create read stream
    const reads = createInterface({
        input: createReadStream(file)
    })

    reads.on("line", (line) => {
        _line(line);
    })

    reads.on("close", () => {
        _line(null);
    })


    function _line(line:string | null) {
        switch(state) {
            case "General": {
                // break - eof
                if(line === null) {
                    break;
                }

                line = line.trim();

                // break - assignment vs definition
                let semicolon_split = line.split(':');
                let equals_split = line.split('=');

                // state definition
                if(semicolon_split.length === 2 && semicolon_split[1].length === 0) {
                    // is a state definition
                    state_name = semicolon_split[0].trim();
                    state = "State";
                    break;
                }

                // assignment
                if(equals_split.length > 1 && equals_split[1].length > 0) {
                    // assigning var
                    let var_name = equals_split[0].trim();
                    let var_value = equals_split[1].trim();
                    
                    // is array or literal?
                    if(var_value.startsWith('[')) {
                        // array
                    } else {
                        // literal
                        
                    }
                }
            } break;
        }
    }
}