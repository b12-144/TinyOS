# TinyOS
This repository provides a [Dockerfile](./Dockerfile) to allow you to construct a custom [Alpine Linux](https://alpinelinux.org/) image with the tools you need. 

Currently, [TinyOS](https://hub.docker.com/repository/docker/tezine/tinyos) provides the following packages:

1. Git
2. Curl
3. Deno
4. Nodejs
5. NPM
6. Python 3 
7. PIP
8. Gradle
9. OpenJDK 11
10. Terraform
11. Docker
12. AWS CLI
13. Kubectl 
14. Terraform CDK

# Add/Remove packages

In case you want to add or remove apps/packages, just edit the Dockerfile to meet your requirements. You can find a complete list of available packages for Alpine Linux [here](https://pkgs.alpinelinux.org/packages). 

For example, if you want to add the [Nano Editor](https://www.nano-editor.org/) into your custom docker image, just add the following line to the Dockerfile:

```dockerfile
RUN apk add --no-cache nano
```

Alpine Linux doesn't use `apt-get` as Debian/Ubuntu, instead it uses `apk`. The command above indicates to run the package installer inside the base image in order to install `nano`. 

# Build and Publish

You can build your custom Docker image by executing the command below in the same directory where Dockerfile is:

```bash
docker build -t tezine/tinyos:1.0.0 .
```

The command above instructs docker to build the image using the Dockerfile available in the current directory (`.`) and create a image named `tezine/tinyos` with version `1.0.0`. Replace `tezine` by your docker hub account (or other registry) and replace `tinyos` by the name you want for your custom image. 

This process will take a while, specially if there are many packages that need to be downloaded and installed by Alpine. It's recommended that you disconnect from VPN to speed up this step. After the image is built, you can publish it into Docker Hub (or other): 

```bash
docker tag tezine/tinyos:1.0.0 tezine/tinyos:latest
docker push tezine/tinyos
```

The first line creates a tag named `latest` to be the same as version `1.0.0`. The second line publishes all versions of your image to the registry. 

# Testing the docker image

After you build your custom image, you can test it to ensure everything is working. It's not necessary to publish the image to the registry, since you already have the image created in your machine. You can get access to the container shell following the steps below:

```bash
docker run --name tinyos -v "/var/run/docker.sock:/var/run/docker.sock:rw" -td tezine/tinyos
```

The command above creates a container named `tinyos` using the image `tezine/tinyos`. If you don't need docker support, you don't need to pass `-v "/var/run/docker.sock:/var/run/docker.sock:rw"`. We pass the flag `-t` to allocate a pseudo-tty or the container will complete and stop almost immediately. It's  just a hack to keep the container running.  The flag `-d` indicates to run the container `detached` (background), this way you are not blocked to access your Windows prompt after executing the container. 

Now, let's get access into the container shell:

```bash
docker exec -it tinyos /bin/sh
```

After running the command above, all subsequent commands are executed in your container. Thus, you can test if the packages you defined in your Dockerfile are working properly. 

# Cool Docker commands

In case you need to destroy the container and its content when the container is stopped, you use `--rm` flag:

```
docker run --name tinyos --rm -td tezine/tinyos
```

This way, you won't need to call `docker rm tinyos`. It's automatically destroyed when container stops. 

You can copy files to the container this way: 

```bash
docker cp pipeline.ts tinyos:/home/deno/pipeline.ts
```

The command above copies the file named  `pipeline.ts` from your current directory to the container in `/home/deno` folder. 

# Jenkins integration

One of the many possibilities a custom docker image provides, is to execute it from Jenkins. To do so, add the following to your Jenkinsfile:

```groovy
//add this to the top of your Jenkinsfile
def pipelineScript= 'docker run -v /var/run/docker.sock:/var/run/docker.sock:rw -v "$(pwd)":/home/deno --entrypoint= tezine/tinyos deno run --unstable --quiet -A /home/deno/pipeline.ts'
```

Than you can create stages like this: 

```groovy
 stage('Npm install') {
     agent { label Constants.sharedAgent }
     steps {
         sh "${pipelineScript} npmInstall" //passes npmInstall as argument to the main function defined in pipeline.ts
     }
 }
```



Enjoy! :heart: