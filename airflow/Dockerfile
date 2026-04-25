# Airflow 3.2.1 image with system Chrome + crawler dependencies baked in.
#
# Why bake Chrome instead of letting Selenium Manager pull it?
#   Tasks should start fast and not depend on outbound chromedriver downloads
#   inside ephemeral worker containers. The Selenium Manager fallback still
#   works at runtime if the system Chrome ever goes missing.

FROM apache/airflow:3.2.1

ARG AIRFLOW_VERSION=3.2.1
ARG PYTHON_VERSION=3.13
ARG CONSTRAINTS_URL=https://raw.githubusercontent.com/apache/airflow/constraints-${AIRFLOW_VERSION}/constraints-${PYTHON_VERSION}.txt

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        wget \
        gnupg \
        ca-certificates \
        fonts-liberation \
        libasound2 \
        libnspr4 \
        libnss3 \
        xdg-utils \
    && wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
    && apt-get install -y --no-install-recommends ./google-chrome-stable_current_amd64.deb \
    && rm -f google-chrome-stable_current_amd64.deb \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

USER airflow

# Step 1: install Airflow providers using Airflow's official constraints —
# this locks the FAB provider to the exact build Airflow 3.2.1 was tested
# with, avoiding the STATE_COLORS / settings-module mismatch.
RUN pip install --no-cache-dir \
        "apache-airflow-providers-fab" \
        --constraint "${CONSTRAINTS_URL}"

# Step 2: install crawler runtime. These aren't in Airflow's constraints
# matrix, so they're installed without --constraint to keep our pins.
COPY requirements.txt /tmp/airflow-requirements.txt
RUN pip install --no-cache-dir -r /tmp/airflow-requirements.txt
