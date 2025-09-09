module.exports = (package) => {return `
Package: ${package.name}
Version: ${package.version}-${package.release}
Section: ${package.section}
Priority: ${package.priority}
Architecture: arm64
Depends: ${package.depends}
Maintainer: ${package.maintainer}
Description: ${package.description}
`}