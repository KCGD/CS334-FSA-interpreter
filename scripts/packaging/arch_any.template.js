const { delim_pkgbuild, remove_deb_versioning } = require("./pkgutils")

module.exports = (package) => {return `
pkgname=${package.name}
pkgver=${package.version}
pkgrel=${package.release}
pkgdesc="${package.description}"
arch=('x86_64' 'arm64' 'aarch64')
license=('${package.license}')
depends=(${delim_pkgbuild(remove_deb_versioning(package.depends))})
options=(!strip)
makedepends=(${delim_pkgbuild(package.builddepends)})

package() {
    cd ..
    mkdir -pv "$pkgdir/usr/local/bin/"
	cp -v ./${package.name} "$pkgdir/usr/local/bin/${package.name}"
}    
`}