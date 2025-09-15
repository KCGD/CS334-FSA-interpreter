import { createWriteStream } from "fs";
import { Parser_Tokens, Program } from "./parser";

export async function PrettyPrint(prog:Program, file:string): Promise<void> {
    /**
     * Export order:
     * 1. write vars
     * 2. write states
     *  2.1. write state definition
     *  2.2. write commands
     *  2.3. write transforms
     */

    return new Promise((resolve, reject) => {
        /**
         * Create write stream
         */
        const out = createWriteStream("./pretty.dfa");
        
        out.on("open", () => {
            /**
            * Write vars
            */
            for(const var_key of Object.keys(prog.vars)) {
                const thisvar = prog.vars[var_key];

                if(Array.isArray(thisvar)) {
                    // write array syntax
                    out.write(`${Parser_Tokens.DEFINE_ARRAY(var_key, thisvar)}\n`);
                } else {
                    // write value syntax
                    out.write(`${Parser_Tokens.DEFINE_VALUE(var_key, thisvar)}\n`);
                }
            }

            /**
             * Write states
             */
            const state_keys = Object.keys(prog.states);
            for(const state_key of state_keys) {
                const state = prog.states[state_key];

                // define state
                out.write(`${Parser_Tokens.DEFINE_STATE(state_key)}\n`);

                // define commands
                let commands = prog.commands[state_key];
                if(commands) {
                    for(const command of commands) {
                        out.write(`\t${Parser_Tokens.DEFINE_COMMAND(command)}\n`);
                    }
                }

                // define transforms
                for(const transform_key of Object.keys(state)) {
                    let transform = state[transform_key];
                    out.write(`\t${Parser_Tokens.DEFINE_TRANSFORM({key: transform_key, transforms: transform})}\n`);
                }
            }

            out.close();
        })

        out.on("close", () => {
            resolve();
        })
    })
}