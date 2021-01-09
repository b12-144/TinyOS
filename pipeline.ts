//you can run this script from Deno this way:
//deno run --unstable --quiet -A pipeline.ts
import { exists } from "https://deno.land/std/fs/mod.ts";

enum Mode {
    unkown,
    standalone,
    localJenkins,
    devJenkins,
    qualJenkins,
    prodJenkins
}

function getMode(m: string): Mode {
    let mode = Mode.unkown;
    switch (m/*mode*/) {
        case 'standalone':
            mode = Mode.standalone
            break;
        case 'localJenkins':
            mode = Mode.localJenkins
            break;
        case 'devJenkins':
            mode = Mode.devJenkins
            break;
        case 'qualJenkins':
            mode = Mode.qualJenkins
            break;
        case 'prodJenkins':
            mode = Mode.prodJenkins
            break;
        default:
            console.log(`invalid mode:${m}`);
            break;
    }
    return mode;
}

export class Publisher {
    repoRootFolder='/home/deno';//there's no need to change this. Just remember to execute from Jenkins with -v "$(pwd)":/home/deno
    mode = Mode.unkown;
    dockerImage='tezine/react-sample'
    repoUrl='yourRepo.git'

    constructor(mode: Mode) {
        this.mode = mode;
        console.log(`loading publisher in ${Mode[mode]} mode...`)
        if(mode===Mode.standalone)this.repoRootFolder='/home/deno/repo'
    }

    public async cloneRepository(userName:string, password:string, branchName:string='master') {
        try {
            console.log(`cloning repository into ${this.repoRootFolder}...`)
            if(exists(this.repoRootFolder))await Deno.remove(this.repoRootFolder, { recursive: true })
            await Deno.mkdir(this.repoRootFolder);
            Deno.chdir(this.repoRootFolder);
            const p = Deno.run({cmd: ['git', 'clone', '--single-branch', '--branch', `${branchName}` ,`https://${userName}:${password}@${this.repoUrl}`, '.'],});
            const output = await p.status();
            if (output.success) {
                console.log('OK');
                return true;
            }
        } catch (e) {
            console.error('Error:', e);
        }
        console.error('Unable to clone repository');
        return false;
    }

    public async npmInstall() {
        try {
            Deno.chdir(this.repoRootFolder);
            console.log('running npm install...')
            const p = Deno.run({cmd: ['npm', 'install','--quiet'],});
            const output = await p.status();
            if (output.success) {
                console.log('OK');
                return true;
            }
        } catch (e) {
            console.error('Error:', e);
        }
        console.error('Unable to exec npm install');
        return false;
    }

    public async npmBuild() {
        try {
            Deno.chdir(this.repoRootFolder);
            console.log('running npm build...')
            const p = Deno.run({cmd: ['npm', 'run', 'build'],});
            const output = await p.status();
            if (output.success) {
                console.log('OK');
                return true;
            }
        } catch (e) {
            console.error('Error:', e);
        }
        console.error('Unable to exec npm install');
        return false;
    }

    public async dockerLogin(login:string, password:string){
        try{
            Deno.chdir(this.repoRootFolder);
            console.log('login into docker...')
            const p = Deno.run({cmd: ['docker', 'login', '--username', `${login}`, '--password',`${password}`],});
            const output = await p.status();
            if(output.success){
                console.log('OK');
                return true;
            }
        }catch (e) {
            console.error('Error:',e);
        }
        console.error('Unable to login into Docker registry');
        return false;
    }

    public async dockerBuild(version:string) {
        try {
            Deno.chdir(this.repoRootFolder);
            console.log('running docker build...')
            const p = Deno.run({cmd: ['docker', 'build','-t',`${this.dockerImage}:${version}`,'-t',`${this.dockerImage}:latest`,'.' ],});
            const output = await p.status();
            if (output.success) {
                console.log('OK');
                return true;
            }
        } catch (e) {
            console.error('Error:', e);
        }
        console.error('Unable to exec docker build');
        return false;
    }

    public async dockerPush(){
        try{
            Deno.chdir(this.repoRootFolder);
            console.log(`pushing docker image ${this.dockerImage}...`)
            const p = Deno.run({
                cmd: ['docker', 'push', `${this.dockerImage}`],
            });
            const output = await p.status();
            if(output.success){
                console.log('OK');
                return true;
            }
        }catch (e) {
            console.error('Error:',e);
        }
        console.error('Unable to push docker image');
        return false;
    }

    public async kubernetesApply(){
        try{
            Deno.chdir(this.repoRootFolder);
            console.log('applying kubernetes...');
            const p = Deno.run({
                cmd: ['kubectl', 'apply', '-f','kubernetes.yaml'],
            });
            const output = await p.status();
            if(output.success){
                console.log('OK');
                return true;
            }
        }catch (e) {
            console.error('Error:',e);
        }
        console.error('Unable to apply kubernetes');
        return false;
    }

    public async runAllStages(gitBranchName:string, gitUserName:string, gitPassword:string, dockerLogin:string, dockerPassword:string, appVersion:string){
        if(!await this.cloneRepository(gitUserName,gitPassword,gitBranchName))return false;
        if(!await this.npmInstall())return false;
        if(!await this.npmBuild())return false;
        if(!await this.dockerLogin(dockerLogin,dockerPassword))return false;
        if(!await this.dockerBuild(appVersion))return false;
        if(!await this.dockerPush())return false;
        //if(!await this.kubernetesApply())return false;
        return true;
    }
}

/*
* Follow a few examples on how to invoke this script
* deno standalone clone : run this script from your notebook without using jenkins, and execute the clone stage
* deno localJenkins clone : run this script from your notebook's jenkins, and execute the clone stage
* deno devJenkins clone : run this script from JD jenkins using development branch, and execute the clone stage
* deno qualJenkins clone : run this script from JD jenkins using quality branch, and execute the clone stage
* deno prodJenkins clone : run this script from JD jenkins using production branch, and execute the clone stage
 */
await main();

async function main() {
    let args = Deno.args;
    if (args.length < 2) {
        console.log('you must call this script using 2 arguments: mode, stage')
        Deno.exit(-1)
    }
    let mode = getMode(args[0])
    if (mode === Mode.unkown) return Deno.exit(-1)
    let publisher = new Publisher(mode);
    switch (args[1]/*stage*/) {
        case 'allStages':
            if(args.length!==8){console.error('you must pass arguments: gitBranchName, gitUserName, gitPassword, dockerLogin, dockerPassword, appVersion');Deno.exit(-1)}
            if (!await publisher.runAllStages(args[2],args[3],args[4],args[5],args[6],args[7])) Deno.exit(-1)
            break;
        case 'clone':
            if(args.length!==5){console.error('you must pass the branchName, userName and password');Deno.exit(-1)}
            if (!await publisher.cloneRepository(args[3],args[4],args[2])) Deno.exit(-1)
            break;
        case 'npmInstall':
            if (!await publisher.npmInstall()) Deno.exit(-1);
            break;
        case 'npmBuild':
            if (!await publisher.npmBuild()) Deno.exit(-1);
            break;
        case 'dockerLogin':
            if(args.length!==4){console.error('you must pass docker login and password');Deno.exit(-1)}
            if (!await publisher.dockerLogin(args[2],args[3])) Deno.exit(-1);
            break;
        case 'dockerBuild':
            if(args.length!==3){console.error('you must pass the version number');Deno.exit(-1)}
            if (!await publisher.dockerBuild(args[2])) Deno.exit(-1);
            break;
        case 'dockerPush':
            if (!await publisher.dockerPush()) Deno.exit(-1);
            break;
        case 'kubernetesApply':
            if (!await publisher.kubernetesApply()) Deno.exit(-1);
            break;
        default:
            console.log('invalid stage')
            Deno.exit(-1)
    }
    console.log('SUCCESS');
}
