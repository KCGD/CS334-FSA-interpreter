/**
 * Control file generator
 * Uses [playform]_[arch].js generator files. Input "package" object
 */

const { readFileSync, existsSync, mkdirSync, writeFileSync } = require("fs");
const { join } = require('path');
const arch_any = require("./arch_any.template");
const debian_aarch64 = require("./debian_aarch64.template");
const debian_x86_64 = require("./debian_x86_64.template");

/**
 *  name            halogen
    version         0.0.7
    release         2
    description     Halogen web server
    section         base
    priority        optional
    depends         nano (>= 6.2-1), socat (>= 1.7.4.1-3)
    builddepends    curl tar gcc python dpkg-deb makepkg
    license         GPLv2
    Maintainer      KCGD <kcgdhosting@gmail.com>

    name derived from package.json base
    version and release both derived from package version
    description & license also straight from package
    everything else comes from package packageOpts object
 */

Main();
function Main() {
    let packageOptions = {};
    let pkg;

    if(process.argv.length-2 < 1) {
        console.error("missing control target (must be arch_any, debian-aarch64, debian-x86_64");
        process.exit(1);
    }

    //load package.json
    try {
        pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json")));
    } catch (e) {
        console.error(`package.json not found at [${join(process.cwd(), "package.json")}]`);
        process.exit(1);
    }

    //load fields from package.json into packageOptions object
    packageOptions.name = pkg.name;
    packageOptions.version = pkg.version.split("-")[0];
    packageOptions.release = pkg.version.split("-")[1] || "0";
    packageOptions.description = pkg.description;
    packageOptions.license = pkg.license;

    //merge in remaining from packageOpts in package.json
    let optFields = Object.keys(pkg.packageOpts);
    for(let i=0; i < optFields.length; i++) {
        packageOptions[optFields[i]] = pkg.packageOpts[optFields[i]];
    }

    //try creating Dist directory
    if(!existsSync(join(process.cwd(), "Dist"))) {
        mkdirSync(join(process.cwd(), "Dist/.tmp"), {'recursive': true});
    }

    //output to Dist/CONTROL
    //TODO: HAS TO RUN THE APPROPRIATE CONVERTER FIRST
    let converter;
    switch(process.argv[2]) {
        case "arch_any": {
            converter = arch_any;
        } break;

        case "debian_aarch64": {
            converter = debian_aarch64;
        } break;

        case "debian_x86_64": {
            converter = debian_x86_64;
        } break;

        default:
            console.error(`Unknown control target: ${process.argv[2]}`);
            process.exit(1);
    }
    writeFileSync(join(process.cwd(), "Dist/CONTROL"), converter(packageOptions));
}