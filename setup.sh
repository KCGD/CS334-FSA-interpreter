#!/bin/sh

echo "Starting setup"

# get platform
PLATFORM=$(uname -s | awk '{print tolower($0)}')

#get architecture
architecture=$(uname -m)
if [ "$architecture" = "x86_64" ]; then
    ARCH="x64"
elif [ "$architecture" = "aarch64" ]; then
    ARCH="arm64"
else
    echo "Unsupported architecture: $architecture"
    exit 1
fi

#node definitions
NODEVER="22.18.0"
NODE="v$NODEVER-$PLATFORM-$ARCH"
NODEURL="https://nodejs.org/dist/v$NODEVER/node-$NODE.tar.xz"
YARN="1.22.22"
YARNURL="https://yarnpkg.com/downloads/$YARN/yarn-v$YARN.tar.gz"

#paths
TMP="/tmp/nodesetup"
BIN="$(pwd)/.bin"
CACHE="$HOME/.cache/node-build-system"

#remove old
echo "Remove old bin files (if any)"
rm -rf "$BIN" || true
rm -rf "./node_modules" || true

#create paths
mkdir "$BIN"
mkdir "$BIN/bin"
#cache may already exist
mkdir -v -p "$CACHE" || true

#get files
echo "Downloading nodejs $NODE"
if [ -f "$CACHE/$(basename $NODEURL)" ]; then
    echo "Found cached version of $(basename $NODEURL)"
else
    curl -# -O --output-dir "$CACHE" "$NODEURL" -L
fi
echo "Downloading yarn v$YARN"
if [ -f "$CACHE/$(basename $YARNURL)" ]; then
    echo "Found cached version of $(basename $YARNURL)"
else
    curl -# -O --output-dir "$CACHE" "$YARNURL" -L
fi

#extract files
echo "Extracting files"
tar -xJf "$CACHE/$(basename "$NODEURL")" -C "$BIN"
tar -xzf "$CACHE/$(basename "$YARNURL")" -C "$BIN"

#linking
echo "Linking node"
ln -s "$BIN/node-$NODE/bin/node" "$BIN/bin/node"

# use link script if on darwin, otherwise use symbolic link
if [ "$PLATFORM" = "darwin" ]; then
    echo "Using link script instead of symbolic link for yarn (Darwin compat)"
    echo "#\!/bin/bash\nnode .bin/yarn-v$YARN/bin/yarn.js \"\$@\"" > ".bin/bin/yarn"
    chmod +x ".bin/bin/yarn"
else 
    echo "Linking yarn"
    ln -s "$BIN/yarn-v$YARN/bin/yarn" "$BIN/bin/yarn"
fi

#applying changes to path
echo "Apply changes to PATH"
. ./.env

#yarn test
echo "Install dependencies"
yarn install

#install native modules
echo "Install native modules"
cd .native && yarn install && cd ..

#gyp rebuild
#echo "Running node-pty rebuild"
#yarn run gyp-rebuild > /dev/null 2>&1

#build program (if given flag)
if [[ $* == *--build* ]]; then
    echo "Running initial build"
    yarn run build
fi

#clean program (if given flag)
if [[ $* == *--clean* ]]; then
    echo "Cleaning build"
    yarn run clean
fi


#packaging flags
if [[ $* == *--pkg-arch* ]]; then
    echo "Packaging for arch"
    yarn pkg-arch
fi

if [[ $* == *--pkg-deb* ]]; then
    echo "Packaging for debian"
    yarn pkg-debian
fi

if [[ $* == *--pkg-all* ]]; then
    echo "Packaging for all platforms"
    yarn pkg-all
fi

echo "Done"
