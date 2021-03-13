const logger = require('logplease').create('runtime');
const semver = require('semver');
const config = require('./config');
const globals = require('./globals');
const fss = require('fs');
const path = require('path');

const runtimes = [];

class Runtime {
    #env_vars
    #compiled
    constructor(package_dir){
        const {language, version, author, build_platform, aliases} = JSON.parse(
            fss.read_file_sync(path.join(package_dir, 'pkg-info.json'))
        );

        this.pkgdir = package_dir;
        this.language = language;
        this.version = semver.parse(version);
        this.author = author;
        this.aliases = aliases;

        if(build_platform != globals.platform){
            logger.warn(`Package ${language}-${version} was built for platform ${build_platform}, but our platform is ${globals.platform}`);
        }
        
        logger.debug(`Package ${language}-${version} was loaded`);
        runtimes.push(this);
    }

    get env_file_path(){
        return path.join(this.pkgdir, 'environment');
    }

    get compiled(){
        if(this.#compiled === undefined) this.#compiled = fss.exists_sync(path.join(this.pkgdir, 'compile'));
        return this.#compiled;
    }

    get env_vars(){
        if(!this.#env_vars){
            const env_file = path.join(this.pkgdir, '.env');
            const env_content = fss.read_file_sync(env_file).toString();
            this.#env_vars = {};
            env_content
                .trim()
                .split('\n')
                .map(line => line.split('=',2))
                .forEach(([key,val]) => {
                    this.#env_vars[key.trim()] = val.trim();
                });
        }
        return this.#env_vars;
    }

    toString(){
        return `${this.language}-${this.version.raw}`;
    }
}

module.exports = runtimes;
module.exports.Runtime = Runtime;
module.exports.get_runtimes_matching_language_version = function(lang, ver){
    return runtimes.filter(rt => (rt.language == lang || rt.aliases.includes(lang)) && semver.satisfies(rt.version, ver));
};
module.exports.get_latest_runtime_matching_language_version = function(lang, ver){
    return module.exports.get_runtimes_matching_language_version(lang, ver)
        .sort((a,b) => semver.rcompare(a.version, b.version))[0];
};
