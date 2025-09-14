import { Program } from "../parser/parser";

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

    for(const token of string) {
        // make sure token exists in language
        if(!prog.lang.includes(token)) {
            throw new Error(`Recieved token '${token}' which does not exist in language [${prog.lang.join(", ")}]`);
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

        path.push(event);
        current_state = destination;

        // check for null state
        if(current_state === "null") {
            break;
        }
    }

    return {
        ending_state: current_state,
        path: path
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
  