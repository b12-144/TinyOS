#Note: Disconnect from VPN to build this image quickly
#To build the image: docker build -t tezine/tinyos:[version] .
#Apline +Deno image size: Only 64mb
#Example on how to execute this image: docker run -it --rm -v "/var/run/docker.sock:/var/run/docker.sock:rw" --name tinyos tezine/tinyos:[version]

FROM frolvlad/alpine-glibc:alpine-3.11_glibc-2.31


ENV DENO_VERSION=1.4.4

RUN apk add --no-cache \
        git \ 
        curl  \        
        nodejs \ 
        nodejs-npm  \
        docker \
        openrc \
        gradle \        
        openjdk11        

# From Alpine Edge repositories
RUN apk add --no-cache  \
        terraform \     
        --repository=http://dl-cdn.alpinelinux.org/alpine/edge/community

# AWS CLI below
RUN apk add --no-cache \
        python3 \
        py3-pip \
        groff \
        && pip3 install --upgrade pip \
        && pip3 install \
        awscli \
        && rm -rf /var/cache/apk/*


# Docker below
RUN rc-update add docker boot

# # Kubectl below
RUN curl -LO https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl
RUN chmod +x ./kubectl
RUN mv ./kubectl /usr/local/bin

# Terraform CDK below
RUN npm install -g cdktf-cli


#  Deno below
RUN apk add --virtual .download --no-cache curl \
        && curl -fsSL https://github.com/denoland/deno/releases/download/v${DENO_VERSION}/deno-x86_64-unknown-linux-gnu.zip \
        --output deno.zip \
        && unzip deno.zip \
        && rm deno.zip \
        && chmod 777 deno \
        && mv deno /bin/deno \
        && apk del .download

RUN addgroup -g 1993 -S deno \
        && adduser -u 1993 -S deno -G deno \
        && mkdir /deno-dir/ \
        && chown deno:deno /deno-dir/

ENV DENO_DIR /deno-dir/
ENV DENO_INSTALL_ROOT /usr/local

COPY ./_entry.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 777 /usr/local/bin/docker-entrypoint.sh

# RUN curl -sL https://deb.nodesource.com/setup_6.x | bash - \
#   && apt-get install -y nodejs

ENTRYPOINT ["docker-entrypoint.sh"]
#CMD /bin/bash  