module.exports = (package) => {return `
Package: ${package.name}
Version: ${package.version}-${package.release}
Section: ${package.section}
Priority: ${package.priority}
Architecture: amd64
Depends: ${package.depends}
Maintainer: ${package.maintainer}
Description: ${package.description}  
`}


/**
 * 
 * CONTINUE: make script to pull this data from package.json and write templates, THEN invoke build script
 * 
 */