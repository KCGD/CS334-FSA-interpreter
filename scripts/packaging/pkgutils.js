module.exports = {
    //convert [x, y, z] to ['x' 'y' 'z']
    "delim_pkgbuild": (s) => {
        return s.split(",")
            .map((i) => {return i.trim()})
            .map((i) => {return `'${i}'`}).join(" ")
    },

    //remove parenthesized versioning in package names.
    // ex: nano (>= 6.2-1) ==> nano
    // convert [x (xv), y (yv)] to [x, y]
    "remove_deb_versioning": (s) => {
        return s.replace(/ *\([^)]*\) */g, "");
    }
}