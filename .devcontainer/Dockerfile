# =============================================================================
# Stage 1: Base system setup
# =============================================================================
ARG VARIANT="noble"
FROM buildpack-deps:${VARIANT}-curl AS base-system

LABEL dev.containers.features="common"

# Ubuntu 24.04 images may contain a default ubuntu user; remove it to avoid UID conflicts.
ARG VARIANT
RUN if [ "$VARIANT" = "noble" ]; then \
      if id "ubuntu" >/dev/null 2>&1; then \
        userdel -f -r ubuntu || true; \
      fi; \
    fi

# Install core system dependencies.
RUN apt-get update \
    && apt-get -y install --no-install-recommends \
        apt-transport-https \
        bash \
        bash-completion \
        build-essential \
        ca-certificates \
        curl \
        git \
        gnupg \
        htop \
        jq \
        software-properties-common \
        sudo \
        unzip \
        wget \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create node user and grant passwordless sudo.
RUN groupadd --gid 1000 node \
    && useradd --uid 1000 --gid node --shell /bin/bash --create-home node \
    && groupadd -r npm \
    && usermod -a -G npm node \
    && echo "node ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/node

# =============================================================================
# Stage 2: Development tools
# =============================================================================
FROM base-system AS dev-tools

# Install docker cli, github cli, infisical, and terraform.
RUN mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" > /etc/apt/sources.list.d/docker.list \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | gpg --dearmor -o /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" > /etc/apt/sources.list.d/github-cli.list \
    && curl -1sLf 'https://artifacts-cli.infisical.com/setup.deb.sh' | bash \
    && wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | tee /usr/share/keyrings/hashicorp-archive-keyring.gpg > /dev/null \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(grep -oP '(?<=UBUNTU_CODENAME=).*' /etc/os-release || lsb_release -cs) main" > /etc/apt/sources.list.d/hashicorp.list \
    && apt-get update -y \
    && apt-get install -y docker-ce-cli docker-buildx-plugin docker-compose-plugin gh infisical terraform \
    && terraform -install-autocomplete \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 24 with nvm and expose binaries for non-login shells.
ENV NVM_DIR=/usr/local/share/nvm
RUN mkdir -p "${NVM_DIR}" \
    && curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash \
    && . "${NVM_DIR}/nvm.sh" \
    && nvm install 24 \
    && nvm alias default 24 \
    && nvm use default \
    && corepack enable \
    && ln -sf "${NVM_DIR}/versions/node/$(nvm version default)/bin/node" /usr/local/bin/node \
    && ln -sf "${NVM_DIR}/versions/node/$(nvm version default)/bin/npm" /usr/local/bin/npm \
    && ln -sf "${NVM_DIR}/versions/node/$(nvm version default)/bin/npx" /usr/local/bin/npx \
    && ln -sf "${NVM_DIR}/versions/node/$(nvm version default)/bin/corepack" /usr/local/bin/corepack \
    && printf 'export NVM_DIR="%s"\n[ -s "%s/nvm.sh" ] && . "%s/nvm.sh"\n' "${NVM_DIR}" "${NVM_DIR}" "${NVM_DIR}" > /etc/profile.d/nvm.sh

# Add pnpm completion path.
USER node
RUN mkdir -p "/home/node/.local/share/bash-completion/completions/"
USER root

# =============================================================================
# Stage 3: Final development environment
# =============================================================================
FROM dev-tools AS final
ENV NODE_ENV=development
ENV PNPM_HOME=/home/node/.local/share/pnpm
ENV APP_PATH=/workspaces/boilerplate

RUN apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR $APP_PATH
USER node

ENTRYPOINT ["sleep", "infinity"]
