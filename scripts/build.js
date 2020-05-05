const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '../build')
const distDir = path.resolve(rootDir, '../', process.env.npm_package_config_dist)

// Load package.json, modify for distribution, and write into dist/
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), { encoding: 'utf8' }))

const packageJsonNew = Object.assign({}, packageJson)
packageJsonNew.name = packageJson.name + '-dist'
packageJsonNew.description = `Compiled version of ${packageJson.name}.`
packageJsonNew.main = './index.js'
packageJsonNew.types = './src/shardus/shardus-types.d.ts'
delete packageJsonNew.files
delete packageJsonNew.config
delete packageJsonNew.scripts
delete packageJsonNew.repository
delete packageJsonNew.devDependencies

packageJsonNew.dependencies['bytenode'] = '1.1.1'

fs.writeFileSync(path.join(distDir, 'package.json'), JSON.stringify(packageJsonNew, null, 2))

// Copy config/, into dist/
copyFolderSync(path.join(rootDir, 'src/config'), path.join(distDir, 'config'))

// Copy src/.../computePowGenerator.js and scripts/build-index.js into dist/
fs.copyFileSync(path.join(rootDir, 'src/crypto/computePowGenerator.js'), path.join(distDir, 'computePowGenerator.js'))
fs.copyFileSync(path.join(__dirname, '../', 'scripts/build-index.js'), path.join(distDir, 'index.js'))

// Copy build/src/shardus/shardus-types.d.ts into dist/src/shardus/shardus-types.d.ts
fs.mkdirSync(path.join(distDir, 'src'))
fs.mkdirSync(path.join(distDir, 'src/shardus'))
fs.copyFileSync(path.join(rootDir, 'src/shardus/shardus-types.d.ts'), path.join(distDir, 'src/shardus/shardus-types.d.ts'))

// Modified from https://stackoverflow.com/a/52338335
function copyFolderSync(from, to) {
  try {
    fs.mkdirSync(to)
  } catch (e) {
    if (e.code !== 'EEXIST') {
      console.log(e)
      return
    }
  }
  fs.readdirSync(from).forEach(element => {
    if (fs.lstatSync(path.join(from, element)).isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element))
    } else {
      copyFolderSync(path.join(from, element), path.join(to, element))
    }
  })
}
