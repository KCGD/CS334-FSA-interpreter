import { ProcessArgs } from "../../main";
import { Program } from "../parser/parser";
import { Log } from "../util/debug";

export type Graph = {
    links: Array<{
        lineAngleAdjust?: number;
        anchorAngle?: number;
        nodeA?: number;
        nodeB?: number;
        node?: number;
        parallelPart: number;
        perpendicularPart: number;
        text: string;
        type: "Link" | "SelfLink" | "StartLink";
    }>;
    nodes: Array<{
        "x": number;
        "y": number;
        "text": string;
        "isAcceptState": boolean;
    }>
}

/**
 * Convert graph JSON representation (from FSA designer), to Program object
 * @param obj 
 */
export async function ConvertGraph(obj:any): Promise<Program> {
    let graph:Graph = {} as Graph;
    try {
        graph = await ValidateGraph(obj);
    } catch (e) {
        throw new Error(`Failed to validate graph: ${e}`);
    }

    const nodes = graph.nodes;
    const links = graph.links;

    // map node index to state name
    let state_name_by_index:{[key:string]: string} = {};

    let proto:Program = {
        "accept": new Array<string>(),
        "start": "null",
        "states": {},
        "vars": {},
        "mode": "DFA",
    } as Program;

    /**
     * iterate nodes to get state names
     */
    for(const i in nodes) {
        const node = nodes[i];
        const name = node.text;
        state_name_by_index[i] = name;
        proto.states[name] = {};

        // lacking null check
        if(node.isAcceptState) {
            proto.accept.push(name);

            // as variable for pretty print
            if(typeof proto.vars["accept"] !== "object") {
                proto.vars["accept"] = [];
            }

            proto.vars["accept"].push(name);
        }

        // check for starting state
        if(name === ProcessArgs.start_state) {
            proto.start = name;
            proto.vars["start"] = name;
        }
    }

    /**
     * iterate lines to establish transforms
     */
    for(const i in links) {
        const link = links[i];
        const key = link.text;

        switch(link.type) {
            case "Link": {
                const source_index = link.nodeA;
                const dest_index = link.nodeB;

                // always save destination states in array. parser will treat the same
                // multiple links with same key ==> ndfa
                let src_state = state_name_by_index[String(source_index)];
                let dst_state = state_name_by_index[String(dest_index)];
                if(!src_state) {
                    throw new Error(`Out of bounds error [source]: Reference to undefined state at index ${source_index}`);
                }
                if(!dst_state) {
                    throw new Error(`Out of bounds error [destination]: Reference to undefined state at index ${source_index}`);
                }

                // define state
                if(!proto.states[src_state]) {
                    proto.states[src_state] = {};
                }

                // define key
                if(!proto.states[src_state][key]) {
                    proto.states[src_state][key] = {};
                }

                proto.states[src_state][key][dst_state] = 1;
            } break;

            case "SelfLink": {
                const dest_index = link.node as number;
                let dst_state = state_name_by_index[String(dest_index)];

                if(!dst_state) {
                    throw new Error(`Out of bounds error [destination]: Reference to undefined state at index ${dest_index}`);
                }

                // define state
                if(!proto.states[dst_state]) {
                    proto.states[dst_state] = {};
                }

                // define key
                if(!key || key.length < 1) {
                    Log(`W`, `Found link to ${dst_state} with no key definition.`);
                } else {
                    if(!proto.states[dst_state][key]) {
                        proto.states[dst_state][key] = {};
                    }

                    proto.states[dst_state][key][dst_state] = 1;
                }
            } break;

            case "StartLink": {
                console.log(link);
                if(typeof link.node === "number") {
                    proto.start = state_name_by_index[String(link.node)]
                }
            }
        }
    }

    // move program mode, start to vars
    proto.vars["mode"] = proto.mode;
    proto.vars["start"] = proto.start;

    return proto;
}

export async function ValidateGraph(obj:any): Promise<Graph> {
    const nodes = obj["nodes"];
    const links = obj["links"];

    if(typeof nodes === "undefined" || !Array.isArray(nodes)) {
        throw new Error(`Expected type Array for nodes property. Recieved "${typeof nodes}"`);
    }

    if(typeof links === "undefined" || !Array.isArray(links)) {
        throw new Error(`Expected type Array for lines property. Recieved "${typeof links}"`);
    }

    /**
     * validate sub properties of each
     */
    for(const node of nodes) {
        try {
            assert("x", node.x, "number");
            assert("y", node.y, "number");
            assert("text", node.text, "string");
            assert("isAcceptState", node.isAcceptState, "boolean");
        } catch (e) {
            throw new Error(`${e}\nIn node:\n${JSON.stringify(node)}`);
        }
    }

    /**
     * validate lines
     */
    for(const line of links) {
        try {
            assert("lineAngleAdjust", line.lineAngleAdjust, ["number", "undefined"]);
            assert("anchorAngle", line.anchorAngle, ["number", "undefined"]);
            assert("nodeA", line.nodeA, ["number", "undefined"]);
            assert("nodeB", line.nodeB, ["number", "undefined"]);
            assert("node", line.node, ["number", "undefined"])
            assert("parallelPart", line.parallelPart, ["number", "undefined"]);
            assert("perpendicularPart", line.perpendicularPart, ["number", "undefined"]);
            assert("text", line.text, "string");
            assert("type", line.type, "string");  // expected value is "Link"
        } catch (e) {
            throw new Error(`${e}\nIn line:\n${JSON.stringify(line)}`);
        }
    }

    return obj as Graph;
}

function assert(prop:string, value:any, type:string | Array<string>) {
    if(Array.isArray(type)) {
        if(!type.includes(typeof value)) {
            throw new Error(`Expected any of type [${type.join(", ")}] for property ${prop}. Recieved "${typeof value}"`);
        }
    }
    else if(typeof value !== type) {
        throw new Error(`Expected type "${type}" for property ${prop}. Recieved "${typeof value}"`);
    }
}