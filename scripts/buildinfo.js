const { randomUUID } = require('crypto');
const fs = require('fs');
const { platform, machine, arch } = require('os');

function Main() {
    if(typeof process.argv[2] !== "string") {
        console.error(`Usage: buildinfo.js <output.js>`);
        process.exit(1);
    }

    let OUTFILE = process.argv[2];

    // declare build info object
    let build_info = {
        time: undefined,
        platform: undefined,
        arch: undefined,
        bits: undefined,
        build_id: undefined,
        node_version: undefined,
    }

    build_info.time = new Date().toDateString();
    build_info.platform = platform();
    build_info.arch = machine();
    build_info.bits = arch();
    build_info.build_id = randomUUID();
    build_info.node_version = process.version;

    try {
        fs.writeFileSync(OUTFILE, createScript(build_info));
    } catch (e) {
        console.error(`Failed to create build info module. ${e}`);
        process.exit(1);
    }

    return;
}

function createScript (object) {
    return `
        module.exports = function BuildInfo() {
            return ${JSON.stringify(object)};
        }
    `;
}

Main();