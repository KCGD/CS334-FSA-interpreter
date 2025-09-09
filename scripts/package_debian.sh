#!/bin/sh

#set fail-on-error
set -e;

#Constant names
EXE_NAME="$1"
PKG_EXT="*.deb"


function do_dep_checks() {
	MISSING_DEP=0;
	echo "[!] Checking dependencies... "
	#DEPS DEFINED HERE
	# make this dynamic in the future
	for name in socat nano dpkg-deb
	do
		echo -n "Checking for $name... "
		if [ $(which $name 2>/dev/null) ]
		then
			echo "FOUND";
		else
			echo "MISSING";
			MISSING_DEP=1;
		fi
	done
	
	if [ $MISSING_DEP -eq 1 ]
	then
		echo "Some dependency checks failed. Cannot proceed.";
		exit 1;
	fi
}


#make directories for the model
function make_directories() {
	echo "[!] Creating directories...";
	mkdir -pv "Dist" || true;
    mkdir -pv "Dist/.tmp" || true;
	mkdir -pv "Dist/.tmp/$EXE_NAME/DEBIAN";
	mkdir -pv "Dist/.tmp/$EXE_NAME/usr/local/bin";
}


#prepare build
function prepare() {
	echo "[!] Preparing package resources...";

    #copy executable
    cp -v "./Build/$EXE_NAME" "./Dist/.tmp/$EXE_NAME/usr/local/bin/$EXE_NAME";

	#move control file
	mv -v "./Dist/CONTROL" "./Dist/.tmp/$EXE_NAME/DEBIAN/control";
}


#build package
function build() {
	echo "[!] Building package...";
    cd "./Dist/.tmp";
    dpkg-deb --build "$EXE_NAME";
    cd ../../
}


#export package
function export_packages() {
    echo "[!] Exporting packages...";
    find "./Dist/.tmp" -name $PKG_EXT -exec cp -v "{}" "./Dist" \;
}


#clean temporaries
function clean_tmp() {
    echo "[!] Cleaning temporaries...";
    rm -r "./Dist/.tmp"
}


#smooth exit function
function do_smooth_exit() {
	echo "[!] Packaging complete.";
	exit 0;
}

do_dep_checks;
make_directories;
prepare;
build;
export_packages;
clean_tmp;
do_smooth_exit;