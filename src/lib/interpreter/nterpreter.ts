import PromptSync from "prompt-sync";
import { ProcessArgs } from "../../main";
import { Program } from "../parser/parser";

const prompt = PromptSync();

type Event = {
    state: string;
    token: string;
    destination: string;
}

export type Answer = {
    ending_state: string;
    path: Array<Event>;
}

export async function interpret(prog:Program, string?:string): Promise<Answer> {
    let path = new Array<Event>;
    let current_state = prog.start;

    if(!string) {
        throw new Error(`No string supplied (add STDIN support!)`);
    }

    // start log
    if(!ProcessArgs.quiet) {
        process.stdout.write(`> [START]`);
    }

    for(const token of string) {
        // make sure token exists in language
        if(!prog.lang.includes(token)) {
            throw new Error(`Recieved token '${token}' which does not exist in language [${prog.lang.join(", ")}]`);
        }

        // run commands
        if(prog.commands[current_state]) {
            for(const c of prog.commands[current_state]) {
                command(c.command, c.args);
            }
        }

        // interpret
        let destination = pickByWeight(prog.states[current_state][token]);
        if(!destination) {
            throw new Error(`Interpreter error: fault in choosing a transform function: ${prog.states[current_state][token]}`);
        }

        // record
        let event = {
            state: current_state,
            token: token,
            destination: destination
        } as Event;

        // print step
        if(!ProcessArgs.quiet) {
            process.stdout.write(`\n> ${event.state} (${event.token} -> ${event.destination})`);
        }

        path.push(event);
        current_state = destination;

        // check for null state
        if(current_state === "null") {
            break;
        }
    }

    // end message
    if(!ProcessArgs.quiet) {
        process.stderr.write("\n> [END]\n");
    }

    return {
        ending_state: current_state,
        path: path
    }
}

function command(command:string, args:Array<string>): void {
    switch(command) {
        case "$log": {
            if(!ProcessArgs.extquiet) {
                process.stdout.write(`\n${args.join(' ')}`);
            }
        } break;

        case "$pause": {
            prompt({});
        } break;

        default: {
            throw new Error(`Interpreter error: Unknown command "${command}" in "\$${command}(${args.join(", ")})"`);
        }
    }
}

function pickByWeight(weights: {[key:string]: number}) {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let chosen: string | undefined = undefined;
  
    let rand = Math.random() * total;
    for (const [key, weight] of entries) {
        if (rand < weight) {
            chosen = key;
            break;
        }
        rand -= weight;
    }

    return chosen;
}
  