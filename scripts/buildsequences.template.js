module.exports = (build) => {return {
        "linux": [
            {command: "mkdir -v Build", name: "mkdir", failureAllowed: true},
            {command: "mkdir -v .tsOut", name: "mkdir", failureAllowed: true},
            {command: "yarn run tsc --pretty", name: "tsc --pretty"},
            {command: "yarn run backpack-cli --use-sea", name: "backpack-cli --use-sea"},
            {command: "node scripts/buildinfo.js ./.tsOut/buildinfo.js", name: "scripts/buildinfo"},
            {command: "yarn run esbuild .tsOut/main.js --bundle --minify --outfile=./.tsOut/bundle.js --platform=node", name: "esbuild"},
            {command: "node --experimental-sea-config sea-config.json", name: "node --experimental-sea-config sea-config.json"},
            {command: `cp "${build.NODE_EXECUTABLE_PATH}" "Build/${build.OUTPUT_EXECUTABLE_NAME}"`, name: "cp"},
            {command: `strip "Build/${build.OUTPUT_EXECUTABLE_NAME}"`, name: "stripping executable"},
            {command: `yarn run postject Build/${build.OUTPUT_EXECUTABLE_NAME} NODE_SEA_BLOB Build/executable.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`, name: "postject"},
            {command: `cp "Build/${build.OUTPUT_EXECUTABLE_NAME}" "Build/${build.PACKAGE_NAME}"`, name: "cp final"}
        ],
        "linux-dev": [
            {command: "mkdir -v .tsOut", name: "mkdir", failureAllowed: true},
            {command: "yarn run backpack-cli --use-sea --passthrough", name: "backpack-cli --use-sea --passthrough"},
        ],
        "darwin": [
            {command: "mkdir -v Build", name: "mkdir", failureAllowed: true},
            {command: "mkdir -v .tsOut", name: "mkdir", failureAllowed: true},
            {command: "yarn run tsc --pretty", name: "tsc --pretty"},
            {command: "yarn run backpack-cli --use-sea", name: "backpack-cli --use-sea"},
            {command: "node scripts/buildinfo.js .tsOut/buildinfo.js", name: "scripts/buildinfo"},
            {command: "yarn run esbuild .tsOut/main.js --bundle --minify --outfile=./.tsOut/bundle.js --platform=node", name: "esbuild"},
            {command: "node --experimental-sea-config sea-config.json", name: "node --experimental-sea-config sea-config.json"},
            {command: `cp "${build.NODE_EXECUTABLE_PATH}" "Build/${build.OUTPUT_EXECUTABLE_NAME}"`, name: "cp"},
            {command: `strip "Build/${build.OUTPUT_EXECUTABLE_NAME}"`, name: "stripping executable"},
            {command: `yarn run postject Build/${build.OUTPUT_EXECUTABLE_NAME} NODE_SEA_BLOB Build/executable.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`, name: "postject"},
            {command: `cp "Build/${build.OUTPUT_EXECUTABLE_NAME}" "Build/${build.PACKAGE_NAME}"`, name: "cp final"}
        ],
        "darwin-dev": [
            {command: "mkdir -v .tsOut", name: "mkdir", failureAllowed: true},
            {command: "yarn run backpack-cli --use-sea --passthrough", name: "backpack-cli --use-sea --passthrough"},
        ],
    }
}