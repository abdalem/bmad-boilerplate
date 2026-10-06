# =============================================================================
# Stage 1: Base system setup
# =============================================================================
ARG VARIANT="noble"
FROM buildpack-deps:${VARIANT}-curl AS base-system

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
        openssh-client \
        software-properties-common \
        sudo \
        unzip \
        util-linux \
        wget \
        xz-utils \
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
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list \
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

# Install Node.js 24 from the official, checksum-verified distribution.
ARG NODE_VERSION="24.15.0"
RUN architecture="$(dpkg --print-architecture)" \
    && case "${architecture}" in \
      amd64) node_arch="x64" ;; \
      arm64) node_arch="arm64" ;; \
      *) echo "Unsupported Node.js architecture: ${architecture}" >&2; exit 1 ;; \
    esac \
    && node_archive="node-v${NODE_VERSION}-linux-${node_arch}.tar.xz" \
    && curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/${node_archive}" \
    && curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt" \
    && grep " ${node_archive}$" SHASUMS256.txt | sha256sum --check - \
    && tar -xJf "${node_archive}" --strip-components=1 -C /usr/local \
    && rm "${node_archive}" SHASUMS256.txt \
    && corepack enable \
    && node --version \
    && corepack --version

# Add pnpm completion path.
ENV UV_INSTALL_DIR=/usr/local/bin
RUN curl -LsSf https://astral.sh/uv/install.sh | sh \
    && uv --version

USER node
RUN mkdir -p "/home/node/.local/share/bash-completion/completions/"
USER root

# =============================================================================
# Stage 3: Final development environment
# =============================================================================
FROM dev-tools AS final
ENV NODE_ENV=development
ENV PNPM_HOME=/home/node/.local/share/pnpm
ENV PATH=/home/node/.local/bin:${PNPM_HOME}:${PATH}
ENV APP_PATH=/workspaces/__PROJECT_SLUG__

RUN apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR $APP_PATH
USER node

RUN bash -c 'command -v pnpm && command -v flock'

ENTRYPOINT ["sleep", "infinity"]
